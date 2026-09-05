/**
 * Server-side checkout gate. Price always comes from the product catalog.
 * Client amounts are ignored. Only Stripe TEST keys are accepted.
 *
 * Withdrawal: starting a service does not automatically waive the 14-day right.
 * If the customer wants delivery to begin before that period ends, collect an
 * explicit request — do not invent an auto-waiver, and do not pre-check it.
 */

import {
  COMMERCE_DEFAULTS,
  isPaymentsEnabledByFlag,
  isPaymentsReady,
  PAYMENTS_NOT_CONFIGURED,
  paymentsNotConfiguredMessage,
  stripeConfigBlocker,
} from "@/lib/commerce";
import { getProduct, getStripePriceId, isCheckoutProduct, resolveCheckoutAmountOre } from "@/lib/products";
import { EARLY_PERFORMANCE_CONSENT } from "@/lib/early-performance";
import { STRIPE_CHECKOUT_MODE } from "@/lib/stripe-config";

export { EARLY_PERFORMANCE_CONSENT };

export type CheckoutStartOk = {
  ok: true;
  amountOre: number;
  stripePriceId: string;
  currency: "dkk";
  mode: typeof STRIPE_CHECKOUT_MODE;
  earlyPerformanceRequested: true;
};

export type CheckoutStartBlocked = {
  ok: false;
  status: 400 | 503;
  error: string;
  reason:
    | "payments_disabled"
    | "live_keys"
    | "invalid_keys"
    | "unknown_product"
    | "payments_unavailable"
    | "missing_stripe_price"
    | "early_performance_required";
};

export type CheckoutStartResult = CheckoutStartOk | CheckoutStartBlocked;

export function evaluateCheckoutStart(input: {
  productId: string;
  /** Ignored. Amount is always resolved from the server catalog. */
  clientAmount?: number;
  earlyPerformanceRequested?: boolean;
}): CheckoutStartResult {
  void input.clientAmount;

  if (!isPaymentsEnabledByFlag()) {
    return {
      ok: false,
      status: 503,
      error: paymentsNotConfiguredMessage(),
      reason: "payments_disabled",
    };
  }

  const blocker = stripeConfigBlocker();
  if (blocker?.reason === "live_keys") {
    return {
      ok: false,
      status: 503,
      error: blocker.error,
      reason: "live_keys",
    };
  }
  if (blocker?.reason === "invalid_keys") {
    return {
      ok: false,
      status: 503,
      error: blocker.error,
      reason: "invalid_keys",
    };
  }

  if (!isPaymentsReady()) {
    return {
      ok: false,
      status: 503,
      error: paymentsNotConfiguredMessage(),
      reason: "payments_disabled",
    };
  }

  const product = getProduct(input.productId);
  if (product && product.paymentsAvailable === false) {
    return {
      ok: false,
      status: 400,
      error: "Denne ydelse kan ikke betales online endnu. Send en forespørgsel i stedet.",
      reason: "payments_unavailable",
    };
  }
  if (!product || !isCheckoutProduct(product)) {
    return {
      ok: false,
      status: 400,
      error: "Ukendt ydelse",
      reason: "unknown_product",
    };
  }

  const amountOre = resolveCheckoutAmountOre(input.productId, input.clientAmount);
  if (amountOre == null) {
    return {
      ok: false,
      status: 400,
      error: "Ukendt ydelse",
      reason: "unknown_product",
    };
  }

  const stripePriceId = getStripePriceId(input.productId);
  if (!stripePriceId) {
    return {
      ok: false,
      status: 503,
      error: PAYMENTS_NOT_CONFIGURED,
      reason: "missing_stripe_price",
    };
  }

  if (!input.earlyPerformanceRequested) {
    return {
      ok: false,
      status: 400,
      error:
        "Bekræft, at du ønsker at ydelsen kan begynde, før fortrydelsesfristen er udløbet.",
      reason: "early_performance_required",
    };
  }

  return {
    ok: true,
    amountOre,
    stripePriceId,
    currency: "dkk",
    mode: STRIPE_CHECKOUT_MODE,
    earlyPerformanceRequested: true,
  };
}

export type WithdrawalConsentInput = {
  /** Customer wants the paid service to begin within the 14-day period. */
  wantsServiceToStartWithinWithdrawalPeriod?: boolean;
  /** Explicit request collected at checkout — must not be pre-checked. */
  explicitEarlyStartRequest?: boolean;
};

export type WithdrawalEvaluation = {
  periodDays: number;
  autoWaiver: false;
  earlyStartWaivesWithdrawal: false;
  needsExplicitEarlyStartRequest: boolean;
  explicitRequestCollected: boolean;
  defaultChecked: false;
  readyForLiveCheckout: false;
};

export function evaluateWithdrawalConsent(
  input: WithdrawalConsentInput = {}
): WithdrawalEvaluation {
  const wantsEarlyStart = Boolean(input.wantsServiceToStartWithinWithdrawalPeriod);
  return {
    periodDays: COMMERCE_DEFAULTS.WITHDRAWAL_DAYS,
    autoWaiver: false,
    earlyStartWaivesWithdrawal: false,
    needsExplicitEarlyStartRequest: wantsEarlyStart,
    explicitRequestCollected: Boolean(input.explicitEarlyStartRequest),
    defaultChecked: false,
    readyForLiveCheckout: false,
  };
}
