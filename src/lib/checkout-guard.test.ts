import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EARLY_PERFORMANCE_CONSENT,
  evaluateCheckoutStart,
  evaluateWithdrawalConsent,
} from "./checkout-guard";
import { STRIPE_CHECKOUT_MODE } from "./stripe-config";

const PAYMENT_ENV = [
  "PAYMENTS_ENABLED",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "DATABASE_URL",
  "STRIPE_PRICE_PT_SINGLE",
  "STRIPE_PRICE_PT_5_CLIP",
  "STRIPE_PRICE_ONLINE_COACHING",
] as const;

function withPaymentEnv(values: Partial<Record<(typeof PAYMENT_ENV)[number], string>>, run: () => void) {
  const previous = Object.fromEntries(PAYMENT_ENV.map((key) => [key, process.env[key]]));
  try {
    for (const key of PAYMENT_ENV) {
      const value = values[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const key of PAYMENT_ENV) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const validTestEnv = {
  PAYMENTS_ENABLED: "true",
  STRIPE_SECRET_KEY: "sk_test_placeholder_not_live",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder_not_live",
  STRIPE_WEBHOOK_SECRET: "whsec_placeholder_not_live",
  DATABASE_URL: "postgres://placeholder",
  STRIPE_PRICE_PT_SINGLE: "price_test_session",
  STRIPE_PRICE_PT_5_CLIP: "price_test_pack",
  STRIPE_PRICE_ONLINE_COACHING: "price_test_online",
} as const;

describe("checkout guard", () => {
  it("blocks payment while PAYMENTS_ENABLED is off", () => {
    const result = evaluateCheckoutStart({
      productId: "session",
      clientAmount: 1,
      earlyPerformanceRequested: true,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 503);
    assert.equal(result.reason, "payments_disabled");
    assert.match(result.error, /ikke aktiveret/);
  });

  it("rejects a live secret key", () => {
    withPaymentEnv(
      {
        ...validTestEnv,
        STRIPE_SECRET_KEY: "sk_live_should_never_work",
      },
      () => {
        const result = evaluateCheckoutStart({
          productId: "session",
          earlyPerformanceRequested: true,
        });
        assert.equal(result.ok, false);
        if (result.ok) return;
        assert.equal(result.reason, "live_keys");
        assert.match(result.error, /Live Stripe-nøgler/);
      }
    );
  });

  it("rejects a live publishable key", () => {
    withPaymentEnv(
      {
        ...validTestEnv,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_should_never_work",
      },
      () => {
        const result = evaluateCheckoutStart({
          productId: "session",
          earlyPerformanceRequested: true,
        });
        assert.equal(result.ok, false);
        if (result.ok) return;
        assert.equal(result.reason, "live_keys");
      }
    );
  });

  it("rejects unknown product ids when payment env is present", () => {
    withPaymentEnv(validTestEnv, () => {
      const unknown = evaluateCheckoutStart({
        productId: "pack-10",
        clientAmount: 999,
        earlyPerformanceRequested: true,
      });
      assert.equal(unknown.ok, false);
      if (unknown.ok) return;
      assert.equal(unknown.status, 400);
      assert.equal(unknown.reason, "unknown_product");
    });
  });

  it("ignores a client-supplied price", () => {
    withPaymentEnv(validTestEnv, () => {
      const result = evaluateCheckoutStart({
        productId: "session",
        clientAmount: 1,
        earlyPerformanceRequested: true,
      });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.amountOre, 30000);
    });
  });

  it("fails safely when Stripe price IDs are missing", () => {
    withPaymentEnv(
      {
        PAYMENTS_ENABLED: "true",
        STRIPE_SECRET_KEY: "sk_test_placeholder_not_live",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder_not_live",
        STRIPE_WEBHOOK_SECRET: "whsec_placeholder_not_live",
        DATABASE_URL: "postgres://placeholder",
      },
      () => {
        const result = evaluateCheckoutStart({
          productId: "session",
          clientAmount: 1,
          earlyPerformanceRequested: true,
        });
        assert.equal(result.ok, false);
        if (result.ok) return;
        assert.equal(result.status, 503);
        assert.equal(result.reason, "missing_stripe_price");
        assert.match(result.error, /ikke aktiveret/);
      }
    );
  });

  it("accepts a valid test-config for catalog products", () => {
    withPaymentEnv(validTestEnv, () => {
      const session = evaluateCheckoutStart({
        productId: "session",
        earlyPerformanceRequested: true,
      });
      assert.equal(session.ok, true);
      if (!session.ok) return;
      assert.equal(session.amountOre, 30000);
      assert.equal(session.stripePriceId, "price_test_session");
      assert.equal(session.mode, STRIPE_CHECKOUT_MODE);
      assert.equal(session.currency, "dkk");

      const pack = evaluateCheckoutStart({
        productId: "pack-5",
        earlyPerformanceRequested: true,
      });
      assert.equal(pack.ok, true);
      if (!pack.ok) return;
      assert.equal(pack.amountOre, 135000);

      const online = evaluateCheckoutStart({
        productId: "online",
        earlyPerformanceRequested: true,
      });
      assert.equal(online.ok, false);
      if (online.ok) return;
      assert.equal(online.reason, "payments_unavailable");
      assert.match(online.error, /ikke betales online endnu/);
    });
  });

  it("blocks Stripe checkout for online coaching even when payments are on", () => {
    withPaymentEnv(validTestEnv, () => {
      const result = evaluateCheckoutStart({
        productId: "online",
        clientAmount: 1,
        earlyPerformanceRequested: true,
      });
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.status, 400);
      assert.equal(result.reason, "payments_unavailable");
    });
  });

  it("requires an explicit early-performance request that is not pre-selected", () => {
    assert.equal(EARLY_PERFORMANCE_CONSENT.defaultChecked, false);
    assert.doesNotMatch(EARLY_PERFORMANCE_CONSENT.checkboxLabel, /fraskriver/i);
    assert.doesNotMatch(EARLY_PERFORMANCE_CONSENT.help, /fraskriver/i);
    assert.match(EARLY_PERFORMANCE_CONSENT.help, /lovbestemte følger/);

    withPaymentEnv(validTestEnv, () => {
      const missing = evaluateCheckoutStart({ productId: "session" });
      assert.equal(missing.ok, false);
      if (missing.ok) return;
      assert.equal(missing.reason, "early_performance_required");
    });
  });

  it("documents 14-day withdrawal without auto-waiver", () => {
    const idle = evaluateWithdrawalConsent();
    assert.equal(idle.periodDays, 14);
    assert.equal(idle.autoWaiver, false);
    assert.equal(idle.earlyStartWaivesWithdrawal, false);
    assert.equal(idle.needsExplicitEarlyStartRequest, false);
    assert.equal(idle.defaultChecked, false);
    assert.equal(idle.readyForLiveCheckout, false);

    const early = evaluateWithdrawalConsent({
      wantsServiceToStartWithinWithdrawalPeriod: true,
      explicitEarlyStartRequest: true,
    });
    assert.equal(early.needsExplicitEarlyStartRequest, true);
    assert.equal(early.explicitRequestCollected, true);
    assert.equal(early.earlyStartWaivesWithdrawal, false);
    assert.equal(early.autoWaiver, false);
    assert.equal(early.readyForLiveCheckout, false);
  });
});
