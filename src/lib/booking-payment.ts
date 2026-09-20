/**
 * PT session: inquiry → Lukas confirms → customer pays via signed link.
 * Price is resolved server-side at checkout (standard or verified VFG member).
 * Client amounts and isMember flags are ignored.
 * Link token is HMAC-signed like the admin cookie — no extra schema field.
 *
 * Token v2: `{bookingId}.{expiresAtUnix}.{hmac}` where hmac covers
 * `booking-pay-v2:{bookingId}:{expiresAtUnix}`. expiresAt is server-computed
 * as min(now + 48h, bookingStart) and cannot be extended by the client.
 *
 * Token v1 (`{bookingId}.{hmac}` without expiry) is verified then rejected as
 * expired. Old links are not left valid forever.
 */

import { createHmac } from "crypto";
import { safeEqual } from "@/lib/admin-auth";
import { resolveCheckoutPrice } from "@/lib/checkout-price";
import { sessionStartAt } from "@/lib/commerce";
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
    | "invalid_token"
    | "expired_token";
  error: string;
};

export const PAYMENT_LINK_TTL_HOURS = 48;
const PAYMENT_LINK_TTL_MS = PAYMENT_LINK_TTL_HOURS * 60 * 60 * 1000;

export const PAYMENT_ERRORS: Record<SessionPaymentBlocked["reason"], string> = {
  not_session: "Kun en bekræftet PT-session kan betales her",
  unconfirmed: "Tiden er ikke bekræftet endnu",
  already_paid: "Denne træning er allerede betalt",
  in_progress: "Betaling er allerede i gang. Prøv igen om et øjeblik.",
  missing_timeslot: "Bookingen mangler dato og tid",
  cancelled: "Denne tid er ikke længere tilgængelig",
  missing_token: "Betalingslinket mangler",
  invalid_token: "Linket er ugyldigt.",
  expired_token: "Betalingslinket er udløbet. Skriv til mig, så sender jeg et nyt.",
};

export const EXPIRED_PAYMENT_LINK_COPY = {
  title: "Linket er udløbet",
  body: PAYMENT_ERRORS.expired_token,
} as const;

function paymentLinkSecret() {
  return process.env.BOOKING_PAY_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || "";
}

export function isPaymentLinkSecretConfigured() {
  return paymentLinkSecret().length >= 8;
}

export function paymentLinkExpiresAt(now: Date, bookingStart: Date) {
  const ttlExpiry = new Date(now.getTime() + PAYMENT_LINK_TTL_MS);
  return ttlExpiry.getTime() <= bookingStart.getTime() ? ttlExpiry : new Date(bookingStart.getTime());
}

export function bookingStartFromTimeslot(date?: string | null, time?: string | null) {
  if (!date || !time) return null;
  const start = sessionStartAt(date, time);
  if (Number.isNaN(start.getTime())) return null;
  return start;
}

function signLegacyBookingPaymentToken(bookingId: string) {
  const secret = paymentLinkSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(`booking-pay-v1:${bookingId}`).digest("hex");
}

export function signBookingPaymentToken(bookingId: string, expiresAtUnix: string | number) {
  const secret = paymentLinkSecret();
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update(`booking-pay-v2:${bookingId}:${expiresAtUnix}`)
    .digest("hex");
}

/** Public token: bookingId.expiresAtUnix.hmac. bookingId is already a UUID. */
export function createBookingPaymentLinkToken(
  bookingId: string,
  input: { date: string; time: string; now?: Date }
) {
  const bookingStart = bookingStartFromTimeslot(input.date, input.time);
  if (!bookingStart) return "";
  const expiresAt = paymentLinkExpiresAt(input.now ?? new Date(), bookingStart);
  const expiresAtUnix = String(Math.floor(expiresAt.getTime() / 1000));
  const mac = signBookingPaymentToken(bookingId, expiresAtUnix);
  if (!mac) return "";
  return `${bookingId}.${expiresAtUnix}.${mac}`;
}

export function parseBookingPaymentLinkToken(token: string) {
  const parts = token.trim().split(".");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { version: 1 as const, bookingId: parts[0], mac: parts[1] };
  }
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return {
      version: 2 as const,
      bookingId: parts[0],
      expiresAtUnix: parts[1],
      mac: parts[2],
    };
  }
  return null;
}

export type BookingPaymentTokenOk = {
  ok: true;
  bookingId: string;
  expiresAt: Date;
};

export type BookingPaymentTokenBlocked = {
  ok: false;
  reason: "invalid_token" | "expired_token";
  bookingId?: string;
};

export function verifyBookingPaymentLinkToken(
  token: string,
  now = new Date()
): BookingPaymentTokenOk | BookingPaymentTokenBlocked {
  const parsed = parseBookingPaymentLinkToken(token);
  if (!parsed) return { ok: false, reason: "invalid_token" };

  if (parsed.version === 1) {
    const expected = signLegacyBookingPaymentToken(parsed.bookingId);
    if (!expected || !safeEqual(parsed.mac, expected)) {
      return { ok: false, reason: "invalid_token" };
    }
    return { ok: false, reason: "expired_token", bookingId: parsed.bookingId };
  }

  if (!/^\d{1,12}$/.test(parsed.expiresAtUnix)) {
    return { ok: false, reason: "invalid_token" };
  }

  const expected = signBookingPaymentToken(parsed.bookingId, parsed.expiresAtUnix);
  if (!expected || !safeEqual(parsed.mac, expected)) {
    return { ok: false, reason: "invalid_token" };
  }

  const expiresAtMs = Number(parsed.expiresAtUnix) * 1000;
  if (expiresAtMs <= now.getTime()) {
    return { ok: false, reason: "expired_token", bookingId: parsed.bookingId };
  }

  return {
    ok: true,
    bookingId: parsed.bookingId,
    expiresAt: new Date(expiresAtMs),
  };
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

export function sessionCheckoutAmountOre(isVfgMember = false) {
  return (
    resolveCheckoutPrice({ productId: "session", isVfgMember })?.amountOre ??
    getCheckoutAmountOre("session")
  );
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
  const bookingStart = bookingStartFromTimeslot(booking.date, booking.time);
  if (bookingStart && bookingStart.getTime() <= now.getTime()) {
    return { ok: false, reason: "expired_token", error: PAYMENT_ERRORS.expired_token };
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
  now?: Date;
}): { ok: true; bookingId: string } | SessionPaymentBlocked {
  void input.clientAmount;
  const token = input.paymentToken?.trim() ?? "";
  if (!token) {
    return { ok: false, reason: "missing_token", error: PAYMENT_ERRORS.missing_token };
  }
  const verified = verifyBookingPaymentLinkToken(token, input.now);
  if (!verified.ok) {
    return {
      ok: false,
      reason: verified.reason,
      error: PAYMENT_ERRORS[verified.reason],
    };
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
  amountOre?: number | null;
}) {
  const product = getProduct("session");
  const amount = input.amountOre ?? sessionCheckoutAmountOre();
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

export function resolveFailedPaymentRetryUrl(
  order: {
    productId: string;
    status?: string | null;
    date?: string | null;
    time?: string | null;
    bookings?: Array<{
      id: string;
      productId: string;
      status: string;
      date?: string | null;
      time?: string | null;
      holdUntil?: Date | null;
    }>;
  },
  now = new Date()
) {
  if (order.productId === "pack-5") {
    return `${getSiteUrl()}/booking`;
  }
  if (order.productId !== "session") return null;

  const booking = order.bookings?.find((row) => row.productId === "session");
  if (!booking?.date || !booking.time) return null;

  const payable = evaluateSessionPayment(
    {
      id: booking.id,
      productId: booking.productId,
      status: booking.status,
      date: booking.date,
      time: booking.time,
      holdUntil: booking.holdUntil,
      orderStatus: order.status ?? null,
    },
    now
  );
  if (!payable.ok) return null;

  const token = createBookingPaymentLinkToken(booking.id, {
    date: booking.date,
    time: booking.time,
    now,
  });
  return token ? bookingPaymentUrl(token) : null;
}

export function buildFailedPaymentCustomerEmail(input: {
  name?: string | null;
  productName: string;
  date?: string | null;
  time?: string | null;
  retryUrl?: string | null;
  contactEmail: string;
}) {
  const greeting = input.name?.trim() ? `Hej ${input.name.trim()}` : "Hej";
  const lines = [
    greeting,
    "",
    "Betalingen gik desværre ikke igennem. Der er ikke trukket penge.",
    "",
    `Ydelse: ${input.productName}`,
  ];
  if (input.date && input.time) {
    lines.push(`Dato: ${formatDate(input.date)}`);
    lines.push(`Tidspunkt: ${input.time}`);
  }
  lines.push("");
  if (input.retryUrl) {
    lines.push("Du kan prøve igen her:");
    lines.push(input.retryUrl);
  } else {
    lines.push(
      `Skriv til mig på ${input.contactEmail}, så sender jeg et nyt betalingslink — eller book en ny tid.`
    );
  }
  lines.push("", "Mvh", "Lukas Møller");
  return {
    subject: `Betalingen gik ikke igennem — ${input.productName}`,
    text: lines.join("\n"),
  };
}

export function publicPaymentPageView(
  booking: SessionBookingSnapshot,
  pricing?: { amountOre?: number | null; priceNote?: string | null }
) {
  const amountOre = pricing?.amountOre ?? sessionCheckoutAmountOre();
  return {
    productName: getProduct("session")?.name ?? "Personlig træning",
    date: booking.date ?? null,
    time: booking.time ?? null,
    name: booking.name ?? "",
    amountOre,
    amountLabel: amountOre != null ? `${amountOre / 100} kr.` : "300 kr.",
    priceNote: pricing?.priceNote ?? null,
    status: booking.status,
  };
}
