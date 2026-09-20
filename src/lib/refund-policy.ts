/**
 * Pure refund eligibility and copy. Safe for the admin UI — no Stripe/DB I/O.
 *
 * Used 5-clip packs are not auto-refunded. That rule already lives in
 * canRefundUnusedClipCard: remaining must equal total, or refund requires
 * manual review. Do not invent a partial/pro-rata policy here.
 */

import { canRefundUnusedClipCard, type ClipCardSnapshot } from "@/lib/commerce";
import { getProduct } from "@/lib/products";
import { formatDate } from "@/lib/utils";

export const REFUND_IDEMPOTENCY_PREFIX = "order-refund:";

export function refundIdempotencyKey(orderId: string) {
  return `${REFUND_IDEMPOTENCY_PREFIX}${orderId}`;
}

export function refundMailClaimId(orderId: string, refundId: string) {
  return `refund-mail:${orderId}:${refundId}`;
}

export type RefundableOrderSnapshot = {
  status: string;
  productId: string;
  amountOre: number;
  chargedAmountOre?: number | null;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
};

export type RefundEligibilityOk = {
  ok: true;
  amountOre: number;
  productId: string;
};

export type RefundEligibilityBlocked = {
  ok: false;
  reason:
    | "not_paid"
    | "already_refunded"
    | "zero_amount"
    | "missing_stripe_payment"
    | "unsupported_product"
    | "clip_card";
  error: string;
};

export type RefundEligibility = RefundEligibilityOk | RefundEligibilityBlocked;

export function refundAmountOre(order: {
  amountOre: number;
  chargedAmountOre?: number | null;
}) {
  const stored = order.chargedAmountOre ?? order.amountOre;
  return Number.isFinite(stored) ? stored : 0;
}

export function hasStoredStripePayment(order: {
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
}) {
  return Boolean(order.stripePaymentIntentId?.trim() || order.stripeCheckoutSessionId?.trim());
}

export function evaluateRefundEligibility(
  order: RefundableOrderSnapshot,
  clipCard: ClipCardSnapshot | null
): RefundEligibility {
  if (order.status === "refunded") {
    return { ok: false, reason: "already_refunded", error: "Ordren er allerede refunderet" };
  }
  if (order.status !== "paid") {
    return { ok: false, reason: "not_paid", error: "Kun betalte ordrer kan refunderes" };
  }

  const amountOre = refundAmountOre(order);
  if (amountOre <= 0) {
    return { ok: false, reason: "zero_amount", error: "Beløbet kan ikke refunderes" };
  }

  if (!hasStoredStripePayment(order)) {
    return {
      ok: false,
      reason: "missing_stripe_payment",
      error: "Betalingen kan ikke verificeres i Stripe",
    };
  }

  if (order.productId === "pack-5") {
    const clip = canRefundUnusedClipCard(clipCard);
    if (!clip.ok) {
      return { ok: false, reason: "clip_card", error: clip.error };
    }
  } else if (order.productId !== "session") {
    return { ok: false, reason: "unsupported_product", error: "Ydelsen kan ikke refunderes her" };
  }

  return { ok: true, amountOre, productId: order.productId };
}

export function canShowAdminRefund(
  order: RefundableOrderSnapshot,
  clipCard: ClipCardSnapshot | null
) {
  return evaluateRefundEligibility(order, clipCard).ok;
}

export function paymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Afventer",
    paid: "Betalt",
    cancelled: "Annulleret",
    refunded: "Refunderet",
    failed: "Fejlet",
  };
  return labels[status] ?? status;
}

export function refundStatusLabel(status: string) {
  return status === "refunded" ? "Refunderet" : "Ikke refunderet";
}

export function adminRefundProductName(productId: string) {
  return getProduct(productId)?.name ?? productId;
}

export function buildRefundCustomerEmail(input: {
  name: string;
  productName: string;
  amountOre: number;
  date?: string | null;
  time?: string | null;
}) {
  const lines = [
    `Hej ${input.name}`,
    "",
    "Din betaling er refunderet.",
    "",
    `Ydelse: ${input.productName}`,
    `Beløb: ${input.amountOre / 100} kr.`,
    "Betalingsstatus: Refunderet",
  ];
  if (input.date && input.time) {
    lines.push(`Dato: ${formatDate(input.date)}`);
    lines.push(`Tidspunkt: ${input.time}`);
  }
  lines.push(
    "",
    "Pengene er tilbageført til den konto, du betalte med. Det kan tage et par hverdage.",
    "",
    "Mvh",
    "Lukas Møller"
  );
  return {
    subject: `Refundering: ${input.productName}`,
    text: lines.join("\n"),
  };
}
