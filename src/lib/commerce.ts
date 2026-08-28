/**
 * Commerce rules for PT booking, clip cards, VAT and cancellation.
 * Change constants/env here rather than rewriting the booking UI.
 */

export const PAYMENTS_NOT_CONFIGURED = "Betaling er ikke konfigureret";

/** LEGAL_PENDING: 24h rule is the intended policy; confirm before live payments. */
export const cancellationConfig = {
  freeCancelHours: 24,
} as const;

export const sessionDuration = {
  minutes: 60,
  copy:
    "Sessionerne er 1:1 og varer som udgangspunkt ca. 60 minutter. Vi tager udgangspunkt i dine mål og dit niveau og arbejder med teknik, styrke og en klar plan fremadrettet. Jeg arbejder ikke med stopuret i hånden – hvis vi er midt i en vigtig øvelse eller gennemgang, afslutter vi den ordentligt, selvom vi går lidt over tiden.",
  notAPromise:
    "Det er ikke et løfte om 75, 90 minutter eller anden gratis ekstra træning.",
} as const;

export const checkoutHoldMinutes = 30;

export const clipCardValidity = {
  /** LEGAL_PENDING: no expiry until Lukas sets one. 0 = no time limit. */
  months: 0,
} as const;

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
    name: "Lukas Møller",
    tradeName: "Personlig træning",
    cvr: process.env.COMPANY_CVR?.trim() ?? "",
    address: process.env.COMPANY_ADDRESS?.trim() ?? "",
  };
}

export function missingPaymentEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY?.trim()) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()) {
    missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!process.env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  return missing;
}

/** Live Stripe stays off until PAYMENTS_ENABLED=true is set after explicit approval. */
export function isPaymentsEnabledByFlag() {
  return envFlag("PAYMENTS_ENABLED", false);
}

export function isPaymentsReady() {
  return isPaymentsEnabledByFlag() && missingPaymentEnv().length === 0;
}

export function paymentsNotConfiguredMessage(missing = missingPaymentEnv()) {
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
  const ms = cancellationConfig.freeCancelHours * 60 * 60 * 1000;
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
};

export function canConsumeClip(card: ClipCardSnapshot | null) {
  if (!card) return { ok: false as const, error: "Klippekortet blev ikke fundet" };
  if (card.status !== "active") return { ok: false as const, error: "Klippekortet er ikke aktivt" };
  if (card.remaining < 1) return { ok: false as const, error: "Ingen træninger tilbage" };
  return { ok: true as const };
}

export function remainingAfterConsume(remaining: number) {
  return Math.max(0, remaining - 1);
}

export function clipStatusAfterConsume(remainingAfter: number) {
  return remainingAfter <= 0 ? "exhausted" : "active";
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
