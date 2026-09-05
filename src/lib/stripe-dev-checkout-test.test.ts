import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateCheckoutStart } from "./checkout-guard";
import { resolveCheckoutAmountOre } from "./products";
import { isStripeDevCheckoutTestAllowed } from "./stripe-config";
import {
  buildStripeDevCheckoutPayload,
  readCheckoutRedirectUrl,
  STRIPE_DEV_TEST_PACK5_PRODUCT_ID,
  STRIPE_DEV_TEST_PRODUCT_ID,
} from "./stripe-dev-checkout-test";

const ENV_KEYS = [
  "PAYMENTS_ENABLED",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "DATABASE_URL",
  "STRIPE_PRICE_PT_SINGLE",
  "NODE_ENV",
  "VERCEL_ENV",
] as const;

function withEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>, run: () => void) {
  const env = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, env[key]]));
  try {
    for (const key of ENV_KEYS) {
      const value = values[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
    run();
  } finally {
    for (const key of ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

const readyDevEnv = {
  NODE_ENV: "development",
  PAYMENTS_ENABLED: "true",
  STRIPE_SECRET_KEY: "sk_test_placeholder_not_live",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder_not_live",
  STRIPE_WEBHOOK_SECRET: "whsec_placeholder_not_live",
  DATABASE_URL: "postgres://placeholder",
  STRIPE_PRICE_PT_SINGLE: "price_test_session",
} as const;

describe("dev-only Stripe checkout test page", () => {
  it("returns 404 outside local test mode", () => {
    withEnv(
      {
        ...readyDevEnv,
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      },
      () => {
        assert.equal(isStripeDevCheckoutTestAllowed(), false);
      }
    );
    withEnv(
      {
        ...readyDevEnv,
        PAYMENTS_ENABLED: "false",
      },
      () => {
        assert.equal(isStripeDevCheckoutTestAllowed(), false);
      }
    );
    withEnv(readyDevEnv, () => {
      assert.equal(isStripeDevCheckoutTestAllowed(), true);
    });
  });

  it("uses the catalog session price and ignores a client amount", () => {
    assert.equal(STRIPE_DEV_TEST_PRODUCT_ID, "session");
    assert.equal(resolveCheckoutAmountOre("session", 1), 30000);
    assert.equal(resolveCheckoutAmountOre("session", 999999), 30000);

    const payload = buildStripeDevCheckoutPayload({ date: "2099-06-02", time: "07:00" });
    assert.equal(payload.productId, "session");
    assert.equal(payload.earlyPerformanceRequested, true);
    assert.equal("amount" in payload, false);

    withEnv(readyDevEnv, () => {
      const rejectedPrice = evaluateCheckoutStart({
        productId: "session",
        clientAmount: 1,
        earlyPerformanceRequested: true,
      });
      assert.equal(rejectedPrice.ok, true);
      if (!rejectedPrice.ok) return;
      assert.equal(rejectedPrice.amountOre, 30000);
    });
  });

  it("builds a pack-5 payload without a client amount", () => {
    assert.equal(STRIPE_DEV_TEST_PACK5_PRODUCT_ID, "pack-5");
    assert.equal(resolveCheckoutAmountOre("pack-5", 1), 135000);
    assert.equal(resolveCheckoutAmountOre("pack-5", 999999), 135000);

    const payload = buildStripeDevCheckoutPayload({
      productId: STRIPE_DEV_TEST_PACK5_PRODUCT_ID,
      date: "2099-06-02",
      time: "07:00",
    });
    assert.equal(payload.productId, "pack-5");
    assert.equal(payload.earlyPerformanceRequested, true);
    assert.equal("amount" in payload, false);
  });

  it("reads a checkout URL from url or checkoutUrl", () => {
    assert.equal(readCheckoutRedirectUrl({ url: "https://checkout.stripe.com/c/pay/cs_test_x" }), "https://checkout.stripe.com/c/pay/cs_test_x");
    assert.equal(
      readCheckoutRedirectUrl({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_y" }),
      "https://checkout.stripe.com/c/pay/cs_test_y"
    );
    assert.equal(readCheckoutRedirectUrl({ ok: true }), null);
    assert.equal(readCheckoutRedirectUrl(null), null);
  });
});
