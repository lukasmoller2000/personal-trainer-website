/**
 * Defensive matching of a verified Stripe Checkout Session against OUR catalog.
 * Amounts in metadata are ignored. Expected amount depends on the stored
 * price tier / verified membership — never a client amount.
 */

import { expectedAmountOreForTier, type PriceTier } from "@/lib/checkout-price";
import { getProduct, getStripePriceId } from "@/lib/products";
import { readStripeMemberPriceId } from "@/lib/stripe-config";

export const EXPECTED_CHECKOUT_CURRENCY = "dkk" as const;

export type StripeCheckoutSnapshot = {
  paymentStatus?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  priceIds?: string[];
  metadataAmount?: unknown;
};

export type PaymentMatchOk = {
  ok: true;
  productId: string;
  amountOre: number;
  currency: typeof EXPECTED_CHECKOUT_CURRENCY;
};

export type PaymentMatchBlocked = {
  ok: false;
  reason: "unknown_product" | "unpaid" | "amount_mismatch" | "currency_mismatch" | "price_mismatch";
};

export type PaymentMatchResult = PaymentMatchOk | PaymentMatchBlocked;

export type StoredCheckoutPricing = {
  priceTier?: string | null;
  vfgMemberVerified?: boolean | null;
  chargedAmountOre?: number | null;
};

export function resolveExpectedStripePriceId(productId: string, priceTier: string) {
  if (priceTier === "vfg_member") {
    return readStripeMemberPriceId(productId);
  }
  return getStripePriceId(productId);
}

/**
 * Accept a session as paid only when Stripe's charged amount, currency and
 * (when a catalog Price ID was used) Price ID match the server catalog for
 * this product + stored membership tier. Client/metadata amounts are discarded.
 */
export function matchStripePaymentToCatalog(
  productId: string,
  snapshot: StripeCheckoutSnapshot,
  stored?: StoredCheckoutPricing
): PaymentMatchResult {
  void snapshot.metadataAmount;

  const priceTier = stored?.priceTier === "vfg_member" && stored.vfgMemberVerified === true
    ? "vfg_member"
    : "standard";
  const expectedOre = expectedAmountOreForTier(
    productId,
    priceTier,
    priceTier === "vfg_member"
  );
  const expectedPriceId = resolveExpectedStripePriceId(productId, priceTier);
  const product = getProduct(productId);
  if (expectedOre == null || !product) {
    return { ok: false, reason: "unknown_product" };
  }

  if (
    stored?.chargedAmountOre != null &&
    stored.chargedAmountOre !== expectedOre
  ) {
    return { ok: false, reason: "amount_mismatch" };
  }

  if (snapshot.paymentStatus && snapshot.paymentStatus !== "paid") {
    return { ok: false, reason: "unpaid" };
  }

  const currency = snapshot.currency?.trim().toLowerCase() ?? "";
  if (currency !== EXPECTED_CHECKOUT_CURRENCY) {
    return { ok: false, reason: "currency_mismatch" };
  }

  if (snapshot.amountTotal !== expectedOre) {
    return { ok: false, reason: "amount_mismatch" };
  }

  if (expectedPriceId && snapshot.priceIds && snapshot.priceIds.length > 0) {
    if (!snapshot.priceIds.includes(expectedPriceId)) {
      return { ok: false, reason: "price_mismatch" };
    }
  }

  return {
    ok: true,
    productId,
    amountOre: expectedOre,
    currency: EXPECTED_CHECKOUT_CURRENCY,
  };
}

export type ClipActivationPlan =
  | { action: "skip"; reason: "not_a_pack" | "already_active" }
  | { action: "create"; totalSessions: number; remaining: number };

export function planClipCardActivation(input: {
  productId: string;
  alreadyHasCard: boolean;
}): ClipActivationPlan {
  const product = getProduct(input.productId);
  if (!product || product.bookingType !== "pack") {
    return { action: "skip", reason: "not_a_pack" };
  }
  if (input.alreadyHasCard) {
    return { action: "skip", reason: "already_active" };
  }
  return {
    action: "create",
    totalSessions: product.sessions,
    remaining: product.sessions,
  };
}

export type WebhookSignatureResult<T> =
  | { ok: true; event: T }
  | { ok: false; error: string };

/** Defensive verification only — callers pass Stripe's constructEvent. */
export function verifyStripeWebhookSignature<T>(input: {
  payload: string;
  signature: string | null;
  secret: string;
  constructEvent: (payload: string, signature: string, secret: string) => T;
}): WebhookSignatureResult<T> {
  if (!input.signature) {
    return { ok: false, error: "Mangler underskrift" };
  }
  try {
    const event = input.constructEvent(input.payload, input.signature, input.secret);
    return { ok: true, event };
  } catch {
    return { ok: false, error: "Ugyldig underskrift" };
  }
}

export function safeCheckoutMetadata(input: {
  productId: string;
  orderId: string;
  bookingId?: string | null;
}) {
  const metadata: Record<string, string> = {
    productId: input.productId,
    orderId: input.orderId,
    requestId: input.orderId,
  };
  if (input.bookingId) metadata.bookingId = input.bookingId;
  return metadata;
}

export function buildStripeCheckoutLineItem(input: {
  productName: string;
  amountOre: number;
  currency?: "dkk";
  stripePriceId: string;
  memberStripePriceId?: string | null;
  priceTier: PriceTier;
  usePriceData: boolean;
}): { quantity: 1; price: string } | { quantity: 1; price_data: {
  currency: "dkk";
  unit_amount: number;
  product_data: { name: string };
} } {
  if (input.usePriceData || (input.priceTier === "vfg_member" && !input.memberStripePriceId)) {
    return {
      quantity: 1,
      price_data: {
        currency: input.currency ?? "dkk",
        unit_amount: input.amountOre,
        product_data: { name: input.productName },
      },
    };
  }

  const priceId =
    input.priceTier === "vfg_member" && input.memberStripePriceId
      ? input.memberStripePriceId
      : input.stripePriceId;

  return {
    quantity: 1,
    price: priceId,
  };
}
