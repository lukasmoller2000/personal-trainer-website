/**
 * Central commerce / legal config for lukasmoller.dk.
 * Change constants and env here — do not scatter prices, flags or legal numbers in the UI.
 *
 * PT session payment flow (gated by PAYMENTS_ENABLED):
 *   choose product → request time → time confirmed → customer can pay
 *   → Stripe Checkout (server amount from productId + verified VFG membership)
 *   → webhook confirms against stored price tier
 *   → booking marked paid (Order.status=paid, paidAt, stripe ids).
 * Order already has productId, amountOre, currency, status, stripeCheckoutSessionId,
 * stripePaymentIntentId and paidAt. No second payment-status field.
 * Public PT form never starts Checkout; pack-5 may when payments are ready.
 */

import {
  evaluateStripeConfig,
  STRIPE_LIVE_KEYS_REJECTED,
} from "@/lib/stripe-config";
import { siteConfig } from "@/lib/utils";

export const PAYMENTS_NOT_CONFIGURED = "Betaling er ikke aktiveret endnu";

/**
 * Official CVR is display-only (footer / legal pages). Address stays empty
 * until filled — never invent one, never render TODO publicly.
 */
export const LEGAL_PENDING = {
  COMPANY_CVR: "46738527",
  COMPANY_ADDRESS: "",
} as const;

/** Decided commercial defaults. Env can override the numbers. */
export const COMMERCE_DEFAULTS = {
  CLIP_EXPIRY_MONTHS: 12,
  CANCELLATION_HOURS: 24,
  WITHDRAWAL_DAYS: 14,
} as const;

/**
 * Refunds are assessed from statutory consumer rights and the agreed
 * cancellation / clip terms. Not a general "ingen refundering" rule.
 */
export const DEFAULT_REFUND_POLICY =
  "Refundering vurderes ud fra kundens lovbestemte rettigheder og de aftalte afbuds- og klipvilkår.";

/**
 * If a recurring subscription is later sold online, the customer must have a
 * real online way to cancel. No subscription is sold now — do not build one,
 * and do not write terms that block that later path.
 */
export const ONLINE_CANCEL_REQUIRED_IF_SUBSCRIPTION = true;

export const FUTURE_PAYMENT_FLOW = [
  "choose_product",
  "request_time",
  "time_confirmed",
  "customer_pays",
  "stripe_checkout",
  "webhook_confirms",
  "booking_marked_paid",
] as const;

function envFlag(name: string, fallback = false) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return fallback;
}

function envInt(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envOptionalPositiveInt(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function getCancellationHours() {
  return Math.max(1, envInt("CANCELLATION_HOURS", COMMERCE_DEFAULTS.CANCELLATION_HOURS));
}

export const cancellationConfig = {
  get freeCancelHours() {
    return getCancellationHours();
  },
};

export const sessionDuration = {
  minutes: 60,
  copy:
    "Sessionerne er 1:1 og varer som udgangspunkt ca. 60 minutter. Vi tager udgangspunkt i dine mål og dit niveau og arbejder med teknik, styrke og en klar plan fremadrettet. Jeg arbejder ikke med stopuret i hånden – hvis vi er midt i en vigtig øvelse eller gennemgang, afslutter vi den ordentligt, selvom vi går lidt over tiden.",
  notAPromise:
    "Det er ikke et løfte om 75, 90 minutter eller anden gratis ekstra træning.",
} as const;

export const checkoutHoldMinutes = 30;

export function getClipExpiryMonths(): number {
  return envOptionalPositiveInt("CLIP_EXPIRY_MONTHS") ?? COMMERCE_DEFAULTS.CLIP_EXPIRY_MONTHS;
}

export const clipCardValidity = {
  get months() {
    return getClipExpiryMonths();
  },
};

export function getRefundPolicy(): string {
  const raw = process.env.REFUND_POLICY?.trim();
  return raw || DEFAULT_REFUND_POLICY;
}

export function getWithdrawalPeriodDays() {
  return COMMERCE_DEFAULTS.WITHDRAWAL_DAYS;
}

export type VatSettings = {
  registered: boolean;
  ratePercent: number;
  pricesIncludeVat: boolean;
  collectBirthYear: boolean;
  exemptUnderAge: number;
  taxableProductIds: string[];
};

export function getVatSettings(): VatSettings {
  return {
    registered: envFlag("VAT_REGISTERED", false),
    ratePercent: envInt("VAT_RATE", 25),
    pricesIncludeVat: envFlag("VAT_PRICES_INCLUDE_VAT", true),
    collectBirthYear: envFlag("VAT_COLLECT_BIRTH_YEAR", false),
    exemptUnderAge: envInt("VAT_EXEMPT_UNDER_AGE", 0),
    taxableProductIds: ["session", "pack-5", "online"],
  };
}

export type VatBreakdown = {
  chargeOre: number;
  vatAmountOre: number;
  vatRatePercent: number;
  vatApplied: boolean;
};

export function calculateVat(
  amountOre: number,
  settings: VatSettings,
  productId: string,
  birthYear?: number | null
): VatBreakdown {
  const taxable = settings.taxableProductIds.includes(productId);
  if (!settings.registered || settings.ratePercent <= 0 || !taxable) {
    return {
      chargeOre: amountOre,
      vatAmountOre: 0,
      vatRatePercent: 0,
      vatApplied: false,
    };
  }

  if (settings.exemptUnderAge > 0 && birthYear) {
    const age = new Date().getFullYear() - birthYear;
    if (age >= 0 && age < settings.exemptUnderAge) {
      return {
        chargeOre: amountOre,
        vatAmountOre: 0,
        vatRatePercent: 0,
        vatApplied: false,
      };
    }
  }

  const rate = settings.ratePercent / 100;
  const vatAmountOre = settings.pricesIncludeVat
    ? Math.round(amountOre - amountOre / (1 + rate))
    : Math.round(amountOre * rate);
  const chargeOre = settings.pricesIncludeVat ? amountOre : amountOre + vatAmountOre;

  return {
    chargeOre,
    vatAmountOre,
    vatRatePercent: settings.ratePercent,
    vatApplied: true,
  };
}

export function getCompanyConfig() {
  return {
    name: process.env.COMPANY_NAME?.trim() || "Lukas Møller",
    tradeName: "Personlig træning",
    /** Legal CVR — env override, otherwise the official display-only default. */
    cvr: process.env.COMPANY_CVR?.trim() || LEGAL_PENDING.COMPANY_CVR,
    /** Legal business address — leave empty until Lukas fills COMPANY_ADDRESS. Falkevej is the training location, not this field. */
    address: process.env.COMPANY_ADDRESS?.trim() || LEGAL_PENDING.COMPANY_ADDRESS,
    email: process.env.CONTACT_EMAIL?.trim() || siteConfig.links.email,
    phone: siteConfig.links.phone,
  };
}

export function missingPaymentEnv(): string[] {
  const stripe = evaluateStripeConfig();
  const missing: string[] = stripe.ok ? [] : [...stripe.missing];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  return missing;
}

export function stripeConfigBlocker(): {
  reason: "live_keys" | "test_keys" | "invalid_keys";
  error: string;
} | null {
  const stripe = evaluateStripeConfig();
  if (stripe.ok) return null;
  if (
    stripe.reason === "live_keys" ||
    stripe.reason === "test_keys" ||
    stripe.reason === "invalid_keys"
  ) {
    return { reason: stripe.reason, error: stripe.error };
  }
  return null;
}

/**
 * One source of truth for live payments.
 * PAYMENTS_ENABLED is canonical. STRIPE_ENABLED is the same flag — we do not
 * read a second env, so the two cannot disagree.
 */
export function isPaymentsEnabledByFlag() {
  return envFlag("PAYMENTS_ENABLED", false);
}

/** Alias of isPaymentsEnabledByFlag — not a second switch. */
export function isStripeEnabled() {
  return isPaymentsEnabledByFlag();
}

export function isPaymentsReady() {
  if (!isPaymentsEnabledByFlag()) return false;
  if (stripeConfigBlocker()) return false;
  return missingPaymentEnv().length === 0;
}

export function paymentsNotConfiguredMessage(missing = missingPaymentEnv()) {
  if (!isPaymentsEnabledByFlag()) return PAYMENTS_NOT_CONFIGURED;
  const blocker = stripeConfigBlocker();
  if (blocker?.reason === "live_keys") return STRIPE_LIVE_KEYS_REJECTED;
  if (blocker?.reason === "test_keys" || blocker?.reason === "invalid_keys") {
    return blocker.error;
  }
  if (missing.length === 0) return PAYMENTS_NOT_CONFIGURED;
  return `${PAYMENTS_NOT_CONFIGURED}. Mangler: ${missing.join(", ")}`;
}

export const orderStatuses = ["pending", "paid", "cancelled", "refunded", "failed"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const bookingStatuses = [
  "inquiry",
  "awaiting_payment",
  "hold",
  "confirmed",
  "cancelled",
  "rejected",
  "no_show",
] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const clipCardStatuses = ["active", "exhausted", "cancelled"] as const;
export type ClipCardStatus = (typeof clipCardStatuses)[number];

/** Computed only — not a persisted Prisma enum. */
export const clipCardEffectiveStatuses = [
  "active",
  "exhausted",
  "cancelled",
  "expired",
  "refunded",
  "inactive",
] as const;
export type ClipCardEffectiveStatus = (typeof clipCardEffectiveStatuses)[number];

export const CLIP_CARD_EXPIRED_MESSAGE = "Klippekortet er udløbet";
export const CLIP_CARD_INACTIVE_MESSAGE = "Klippekortet er ikke aktivt";
export const CLIP_CARD_EMPTY_MESSAGE = "Ingen træninger tilbage";
export const CLIP_CARD_MISSING_MESSAGE = "Klippekortet blev ikke fundet";
export const CLIP_LOOKUP_GENERIC_MESSAGE =
  "Hvis der er et aktivt klippekort på denne mail, sender vi et link til at booke.";

export function canTransitionOrder(from: string, to: OrderStatus) {
  if (from === to) return false;
  if (from === "refunded" || from === "cancelled") return false;
  if (to === "paid") return from === "pending";
  if (to === "failed") return from === "pending";
  if (to === "cancelled") return from === "pending" || from === "paid";
  if (to === "refunded") return from === "paid";
  return false;
}

export function canCancelFree(sessionStart: Date, now = new Date()) {
  const ms = getCancellationHours() * 60 * 60 * 1000;
  return sessionStart.getTime() - now.getTime() >= ms;
}

export function sessionStartAt(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

export function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export function rememberEventId(seen: ReadonlySet<string>, eventId: string) {
  if (seen.has(eventId)) return "duplicate" as const;
  return "new" as const;
}

export type ClipCardSnapshot = {
  status: string;
  remaining: number;
  totalSessions: number;
  createdAt?: Date | string | null;
  expiresAt?: Date | string | null;
};

function asClipDate(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function clipCardExpiresAt(
  card: Pick<ClipCardSnapshot, "createdAt" | "expiresAt">,
  months = getClipExpiryMonths()
): Date | null {
  const explicit = asClipDate(card.expiresAt);
  if (explicit) return explicit;
  const createdAt = asClipDate(card.createdAt);
  if (createdAt) return clipExpiresAt(createdAt, months);
  return null;
}

export function isClipSnapshotExpired(
  card: Pick<ClipCardSnapshot, "createdAt" | "expiresAt">,
  now = new Date()
) {
  const expiresAt = clipCardExpiresAt(card);
  if (!expiresAt) return false;
  return now.getTime() >= expiresAt.getTime();
}

/**
 * Server-side status from stored status + expiry + remaining.
 * Do not persist "expired" — compute it so cron is not required.
 */
export function effectiveClipCardStatus(
  card: Pick<ClipCardSnapshot, "status" | "remaining" | "createdAt" | "expiresAt">,
  now = new Date()
): ClipCardEffectiveStatus | string {
  if (card.status === "refunded" || card.status === "cancelled" || card.status === "inactive") {
    return card.status;
  }
  if (isClipSnapshotExpired(card, now)) return "expired";
  if (card.remaining <= 0 || card.status === "exhausted") return "exhausted";
  if (card.status === "active") return "active";
  return card.status;
}

export function isClipCardUsable(
  card: Pick<ClipCardSnapshot, "status" | "remaining" | "createdAt" | "expiresAt"> | null,
  now = new Date()
) {
  return Boolean(card) && effectiveClipCardStatus(card!, now) === "active";
}

export function clipCardAccessError(
  card: ClipCardSnapshot | null,
  now = new Date()
): string | null {
  if (!card) return CLIP_CARD_MISSING_MESSAGE;
  const status = effectiveClipCardStatus(card, now);
  if (status === "expired") return CLIP_CARD_EXPIRED_MESSAGE;
  if (status !== "active") return CLIP_CARD_INACTIVE_MESSAGE;
  if (card.remaining < 1) return CLIP_CARD_EMPTY_MESSAGE;
  return null;
}

export function canConsumeClip(card: ClipCardSnapshot | null, now = new Date()) {
  const error = clipCardAccessError(card, now);
  if (error) return { ok: false as const, error };
  return { ok: true as const };
}

export function evaluateClipCardPublicView(card: ClipCardSnapshot | null, now = new Date()) {
  if (!card) {
    return { ok: false as const, error: CLIP_CARD_MISSING_MESSAGE, status: null };
  }
  const status = effectiveClipCardStatus(card, now);
  if (status === "expired") {
    return { ok: false as const, error: CLIP_CARD_EXPIRED_MESSAGE, status };
  }
  if (status === "cancelled" || status === "refunded" || status === "inactive") {
    return { ok: false as const, error: CLIP_CARD_MISSING_MESSAGE, status };
  }
  return { ok: true as const, status, remaining: card.remaining };
}

export function evaluateClipCardBooking(card: ClipCardSnapshot | null, now = new Date()) {
  const view = evaluateClipCardPublicView(card, now);
  if (!view.ok) return view;
  if (view.status !== "active") {
    return { ok: false as const, error: CLIP_CARD_INACTIVE_MESSAGE, status: view.status };
  }
  return { ok: true as const, status: view.status, remaining: view.remaining };
}

export function selectUsableClipCardForLookup<T extends ClipCardSnapshot>(
  cards: T[],
  now = new Date()
): T | null {
  return cards.find((card) => isClipCardUsable(card, now)) ?? null;
}

export function remainingAfterConsume(remaining: number) {
  return Math.max(0, remaining - 1);
}

export function clipStatusAfterConsume(remainingAfter: number) {
  return remainingAfter <= 0 ? "exhausted" : "active";
}

export function clipExpiresAt(activatedAt: Date, months = getClipExpiryMonths()) {
  const expires = new Date(activatedAt);
  expires.setMonth(expires.getMonth() + months);
  return expires;
}

export function isClipCardExpired(activatedAt: Date, now = new Date()) {
  return now.getTime() >= clipExpiresAt(activatedAt).getTime();
}

/** Unused pack only: remaining must equal total. Used clips are not auto-refunded. */
export function canRefundUnusedClipCard(card: ClipCardSnapshot | null) {
  if (!card) return { ok: false as const, error: "Klippekortet blev ikke fundet" };
  if (card.status !== "active") {
    return { ok: false as const, error: "Klippekortet er ikke aktivt" };
  }
  if (card.remaining !== card.totalSessions) {
    return {
      ok: false as const,
      error: "Klippekortet er delvist brugt. Refundering kræver manuel gennemgang.",
    };
  }
  return { ok: true as const };
}
