/**
 * Central commerce / legal config for lukasmoller.dk.
 * Change constants and env here — do not scatter prices, flags or legal numbers in the UI.
 *
 * Intended future payment flow (NOT enabled):
 *   choose product → request time → time confirmed → customer can pay
 *   → Stripe Checkout (server amount from productId) → webhook confirms
 *   → booking marked paid (Order.status=paid, paidAt, stripe ids).
 * Order already has productId, amountOre, currency, status, stripeCheckoutSessionId,
 * stripePaymentIntentId and paidAt. No second payment-status field.
 */

import {
  evaluateStripeTestConfig,
  STRIPE_LIVE_KEYS_REJECTED,
} from "@/lib/stripe-config";
import { siteConfig } from "@/lib/utils";

export const PAYMENTS_NOT_CONFIGURED = "Betaling er ikke aktiveret endnu";

/**
 * LEGAL_PENDING — CVR and address stay empty until Lukas fills them.
 * Never render placeholder / TODO values publicly.
 */
export const LEGAL_PENDING = {
  COMPANY_CVR: "",
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
    /** Legal CVR — leave empty until Lukas fills COMPANY_CVR. Do not invent a value. */
    cvr: process.env.COMPANY_CVR?.trim() || LEGAL_PENDING.COMPANY_CVR,
    /** Legal business address — leave empty until Lukas fills COMPANY_ADDRESS. Falkevej is the training location, not this field. */
    address: process.env.COMPANY_ADDRESS?.trim() || LEGAL_PENDING.COMPANY_ADDRESS,
    email: process.env.CONTACT_EMAIL?.trim() || siteConfig.links.email,
    phone: siteConfig.links.phone,
  };
}

export function missingPaymentEnv(): string[] {
  const stripe = evaluateStripeTestConfig();
  const missing: string[] = stripe.ok ? [] : [...stripe.missing];
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  return missing;
}

export function stripeConfigBlocker(): { reason: "live_keys" | "invalid_keys"; error: string } | null {
  const stripe = evaluateStripeTestConfig();
  if (stripe.ok) return null;
  if (stripe.reason === "live_keys" || stripe.reason === "invalid_keys") {
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
  if (blocker?.reason === "invalid_keys") return blocker.error;
  if (missing.length === 0) return PAYMENTS_NOT_CONFIGURED;
  return `${PAYMENTS_NOT_CONFIGURED}. Mangler: ${missing.join(", ")}`;
}

export const orderStatuses = ["pending", "paid", "cancelled", "refunded", "failed"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const bookingStatuses = ["inquiry", "hold", "confirmed", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const clipCardStatuses = ["active", "exhausted", "cancelled"] as const;
export type ClipCardStatus = (typeof clipCardStatuses)[number];

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
  createdAt?: Date;
};

export function canConsumeClip(card: ClipCardSnapshot | null, now = new Date()) {
  if (!card) return { ok: false as const, error: "Klippekortet blev ikke fundet" };
  if (card.status !== "active") return { ok: false as const, error: "Klippekortet er ikke aktivt" };
  if (card.createdAt && isClipCardExpired(card.createdAt, now)) {
    return { ok: false as const, error: "Klippekortet er udløbet" };
  }
  if (card.remaining < 1) return { ok: false as const, error: "Ingen træninger tilbage" };
  return { ok: true as const };
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
