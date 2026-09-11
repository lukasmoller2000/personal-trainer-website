/**
 * PT session: inquiry → Lukas confirms → customer pays via signed link.
 * Price always comes from the catalog (300 kr). Client amounts are ignored.
 * Link token is HMAC-signed like the admin cookie — no extra schema field.
 */

import { createHmac } from "crypto";
import { safeEqual } from "@/lib/admin-auth";
import { getCheckoutAmountOre, getProduct } from "@/lib/products";
import { formatDate, getSiteUrl } from "@/lib/utils";
import { PAYMENT_CANCEL_QUERY } from "@/lib/payment-result";

export const BOOKING_STATUS = {
  inquiry: "inquiry",
  awaitingPayment: "awaiting_payment",
  hold: "hold",
  confirmed: "confirmed",
  cancelled: "cancelled",
  rejected: "rejected",
  noShow: "no_show",
} as const;

export type SessionBookingSnapshot = {
  id: string;
  productId: string;
  status: string;
  date?: string | null;
  time?: string | null;
  name?: string;
  email?: string;
  holdUntil?: Date | null;
  orderStatus?: string | null;
};

export type BookingDecision = "confirm" | "reject" | "resend";

export type SessionPaymentBlocked = {
  ok: false;
  reason:
    | "not_session"
    | "unconfirmed"
    | "already_paid"
    | "in_progress"
    | "missing_timeslot"
    | "cancelled"
    | "missing_token"
    | "invalid_token";
  error: string;
};

const PAYMENT_ERRORS: Record<SessionPaymentBlocked["reason"], string> = {
  not_session: "Kun en bekræftet PT-session kan betales her",
  unconfirmed: "Tiden er ikke bekræftet endnu",
  already_paid: "Denne træning er allerede betalt",
  in_progress: "Betaling er allerede i gang. Prøv igen om et øjeblik.",
  missing_timeslot: "Bookingen mangler dato og tid",
  cancelled: "Denne tid er ikke længere tilgængelig",
  missing_token: "Betalingslinket mangler",
  invalid_token: "Linket er ugyldigt eller udløbet",
};

function paymentLinkSecret() {
  return process.env.BOOKING_PAY_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || "";
}

export function isPaymentLinkSecretConfigured() {
  return paymentLinkSecret().length >= 8;
}

export function signBookingPaymentToken(bookingId: string) {
  const secret = paymentLinkSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(`booking-pay-v1:${bookingId}`).digest("hex");
}

/** Public token: bookingId.hmac. bookingId is already a UUID. */
export function createBookingPaymentLinkToken(bookingId: string) {
  const mac = signBookingPaymentToken(bookingId);
  if (!mac) return "";
  return `${bookingId}.${mac}`;
}

export function parseBookingPaymentLinkToken(token: string) {
  const trimmed = token.trim();
  const sep = trimmed.lastIndexOf(".");
  if (sep <= 0 || sep === trimmed.length - 1) return null;
  return {
    bookingId: trimmed.slice(0, sep),
    mac: trimmed.slice(sep + 1),
  };
}

export function verifyBookingPaymentLinkToken(token: string) {
  const parsed = parseBookingPaymentLinkToken(token);
  if (!parsed) return { ok: false as const, reason: "invalid_token" as const };
  const expected = signBookingPaymentToken(parsed.bookingId);
  if (!expected || !safeEqual(parsed.mac, expected)) {
    return { ok: false as const, reason: "invalid_token" as const };
  }
  return { ok: true as const, bookingId: parsed.bookingId };
}

export function bookingPaymentPath(linkToken: string) {
  return `/booking/betaling/${encodeURIComponent(linkToken)}`;
}

export function bookingPaymentUrl(linkToken: string, siteUrl = getSiteUrl()) {
  return `${siteUrl}${bookingPaymentPath(linkToken)}`;
}

export function bookingPaymentCancelPath(linkToken: string) {
  return `${bookingPaymentPath(linkToken)}?betaling=${PAYMENT_CANCEL_QUERY}`;
}

export function sessionCheckoutAmountOre() {
  return getCheckoutAmountOre("session");
}

export function isSessionProductId(productId: string) {
  return productId === "session";
}

export function canConfirmSessionInquiry(booking: SessionBookingSnapshot) {
  if (!isSessionProductId(booking.productId)) {
    return { ok: false as const, error: "Kun PT-sessioner kan bekræftes til betaling" };
  }
  if (booking.status !== BOOKING_STATUS.inquiry) {
    return { ok: false as const, error: "Bookingen kan ikke bekræftes i denne status" };
  }
  if (!booking.date || !booking.time) {
    return { ok: false as const, error: "Bookingen mangler dato og tid" };
  }
  return { ok: true as const };
}

export function canRejectSessionBooking(booking: SessionBookingSnapshot) {
  if (!isSessionProductId(booking.productId)) {
    return { ok: false as const, error: "Kun PT-sessioner kan afvises her" };
  }
  if (
    booking.status !== BOOKING_STATUS.inquiry &&
    booking.status !== BOOKING_STATUS.awaitingPayment
  ) {
    return { ok: false as const, error: "Bookingen kan ikke afvises i denne status" };
  }
  return { ok: true as const };
}

export function canResendPaymentLink(booking: SessionBookingSnapshot) {
  if (!isSessionProductId(booking.productId)) {
    return { ok: false as const, error: "Kun PT-sessioner har betalingslink" };
  }
  if (booking.status !== BOOKING_STATUS.awaitingPayment) {
    return { ok: false as const, error: "Betalingslink sendes kun, når tiden er bekræftet" };
  }
  return { ok: true as const };
}

export function shouldSendDecisionEmail(action: BookingDecision, fromStatus: string) {
  if (action === "confirm") return fromStatus === BOOKING_STATUS.inquiry;
  if (action === "reject") {
    return fromStatus === BOOKING_STATUS.inquiry || fromStatus === BOOKING_STATUS.awaitingPayment;
  }
  if (action === "resend") return fromStatus === BOOKING_STATUS.awaitingPayment;
  return false;
}

export function evaluateSessionPayment(
  booking: SessionBookingSnapshot,
  now = new Date()
): { ok: true } | SessionPaymentBlocked {
  if (!isSessionProductId(booking.productId)) {
    return { ok: false, reason: "not_session", error: PAYMENT_ERRORS.not_session };
  }
  if (!booking.date || !booking.time) {
    return { ok: false, reason: "missing_timeslot", error: PAYMENT_ERRORS.missing_timeslot };
  }
  if (booking.status === BOOKING_STATUS.confirmed || booking.orderStatus === "paid") {
    return { ok: false, reason: "already_paid", error: PAYMENT_ERRORS.already_paid };
  }
  if (booking.status === BOOKING_STATUS.cancelled || booking.status === BOOKING_STATUS.rejected) {
    return { ok: false, reason: "cancelled", error: PAYMENT_ERRORS.cancelled };
  }
  if (booking.status === BOOKING_STATUS.inquiry) {
    return { ok: false, reason: "unconfirmed", error: PAYMENT_ERRORS.unconfirmed };
  }
  if (
    booking.status === BOOKING_STATUS.hold &&
    booking.holdUntil &&
    booking.holdUntil.getTime() > now.getTime()
  ) {
    return { ok: false, reason: "in_progress", error: PAYMENT_ERRORS.in_progress };
  }
  if (
    booking.status === BOOKING_STATUS.awaitingPayment ||
    (booking.status === BOOKING_STATUS.hold &&
      (!booking.holdUntil || booking.holdUntil.getTime() <= now.getTime()))
  ) {
    return { ok: true };
  }
  return { ok: false, reason: "unconfirmed", error: PAYMENT_ERRORS.unconfirmed };
}

export function evaluateSessionCheckoutBinding(input: {
  paymentToken?: string;
  productId?: string;
  clientAmount?: number;
}): { ok: true; bookingId: string } | SessionPaymentBlocked {
  void input.clientAmount;
  const token = input.paymentToken?.trim() ?? "";
  if (!token) {
    return { ok: false, reason: "missing_token", error: PAYMENT_ERRORS.missing_token };
  }
  const verified = verifyBookingPaymentLinkToken(token);
  if (!verified.ok) {
    return { ok: false, reason: "invalid_token", error: PAYMENT_ERRORS.invalid_token };
  }
  if (input.productId && input.productId !== "session") {
    return { ok: false, reason: "not_session", error: PAYMENT_ERRORS.not_session };
  }
  return { ok: true, bookingId: verified.bookingId };
}

export function bookingStatusAfterPaid(current: string) {
  if (current === BOOKING_STATUS.confirmed) return BOOKING_STATUS.confirmed;
  if (current === BOOKING_STATUS.hold || current === BOOKING_STATUS.awaitingPayment) {
    return BOOKING_STATUS.confirmed;
  }
  return current;
}

export function bookingStatusAfterCheckoutExpired(current: string) {
  if (current === BOOKING_STATUS.hold) return BOOKING_STATUS.awaitingPayment;
  return current;
}

export function blocksTimeslot(status: string, holdUntil: Date | null, now = new Date()) {
  if (
    status === BOOKING_STATUS.inquiry ||
    status === BOOKING_STATUS.awaitingPayment ||
    status === BOOKING_STATUS.confirmed
  ) {
    return true;
  }
  if (status === BOOKING_STATUS.hold && holdUntil && holdUntil.getTime() > now.getTime()) {
    return true;
  }
  return false;
}

export function buildConfirmCustomerEmail(input: {
  name: string;
  date: string;
  time: string;
  paymentUrl: string;
}) {
  const product = getProduct("session");
  const amount = sessionCheckoutAmountOre();
  const price = amount != null ? `${amount / 100} kr.` : "300 kr.";
  return {
    subject: `Bekræftet tid — betal ${price} for personlig træning`,
    text: [
      `Hej ${input.name}`,
      "",
      "Jeg har bekræftet din ønskede tid.",
      "",
      `Ydelse: ${product?.name ?? "Personlig træning"}`,
      `Dato: ${formatDate(input.date)}`,
      `Tidspunkt: ${input.time}`,
      `Pris: ${price}`,
      "",
      "Tiden gælder først, når betalingen er gennemført.",
      "",
      `Betal her: ${input.paymentUrl}`,
      "",
      "Mvh",
      "Lukas Møller",
    ].join("\n"),
  };
}

export function buildRejectCustomerEmail(input: {
  name: string;
  date?: string | null;
  time?: string | null;
}) {
  const when =
    input.date && input.time
      ? ` den ønskede tid ${formatDate(input.date)} kl. ${input.time}`
      : " den ønskede tid";
  return {
    subject: "Angående din forespørgsel om personlig træning",
    text: [
      `Hej ${input.name}`,
      "",
      `Jeg kan desværre ikke bekræfte${when}.`,
      "",
      "Skriv gerne, hvis du vil foreslå et andet tidspunkt.",
      "",
      "Mvh",
      "Lukas Møller",
    ].join("\n"),
  };
}

export function publicPaymentPageView(booking: SessionBookingSnapshot) {
  const amountOre = sessionCheckoutAmountOre();
  return {
    productName: getProduct("session")?.name ?? "Personlig træning",
    date: booking.date ?? null,
    time: booking.time ?? null,
    name: booking.name ?? "",
    amountOre,
    amountLabel: amountOre != null ? `${amountOre / 100} kr.` : "300 kr.",
    status: booking.status,
  };
}
