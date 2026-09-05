import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyStripePublishableKey,
  classifyStripeSecretKey,
  evaluateStripeTestConfig,
  hasLiveStripeKeys,
  isStripeDevCheckoutTestAllowed,
  isStripeDevEndpointAllowed,
  parseStripeSecretKey,
  readStripePriceId,
  STRIPE_CHECKOUT_MODE,
  STRIPE_LIVE_KEYS_REJECTED,
} from "./stripe-config";

const KEY_ENV = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NODE_ENV",
  "VERCEL_ENV",
] as const;

function withEnv(values: Partial<Record<(typeof KEY_ENV)[number], string>>, run: () => void) {
  const env = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(KEY_ENV.map((key) => [key, env[key]]));
  try {
    for (const key of KEY_ENV) {
      const value = values[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
    run();
  } finally {
    for (const key of KEY_ENV) {
      const value = previous[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

describe("Stripe test-key guards", () => {
  it("rejects a live secret key", () => {
    assert.equal(classifyStripeSecretKey("sk_live_abc123"), "live");
    assert.equal(parseStripeSecretKey("sk_live_abc123").kind, "live");
    withEnv(
      {
        STRIPE_SECRET_KEY: "sk_live_abc123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc123",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
      },
      () => {
        const config = evaluateStripeTestConfig();
        assert.equal(config.ok, false);
        if (config.ok) return;
        assert.equal(config.reason, "live_keys");
        assert.equal(config.error, STRIPE_LIVE_KEYS_REJECTED);
        assert.equal(hasLiveStripeKeys(), true);
      }
    );
  });

  it("rejects a live publishable key", () => {
    assert.equal(classifyStripePublishableKey("pk_live_abc123"), "live");
    withEnv(
      {
        STRIPE_SECRET_KEY: "sk_test_abc123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc123",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
      },
      () => {
        const config = evaluateStripeTestConfig();
        assert.equal(config.ok, false);
        if (config.ok) return;
        assert.equal(config.reason, "live_keys");
        assert.equal(hasLiveStripeKeys(), true);
      }
    );
  });

  it("accepts a valid test config", () => {
    withEnv(
      {
        STRIPE_SECRET_KEY: "sk_test_abc123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc123",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
      },
      () => {
        const config = evaluateStripeTestConfig();
        assert.equal(config.ok, true);
        if (!config.ok) return;
        assert.equal(config.secretKey.startsWith("sk_test_"), true);
        assert.equal(config.publishableKey.startsWith("pk_test_"), true);
        assert.equal(hasLiveStripeKeys(), false);
      }
    );
  });

  it("treats missing test keys as missing, not live", () => {
    withEnv({}, () => {
      const config = evaluateStripeTestConfig();
      assert.equal(config.ok, false);
      if (config.ok) return;
      assert.equal(config.reason, "missing_keys");
      assert.ok(config.missing.includes("STRIPE_SECRET_KEY"));
    });
  });

  it("never uses subscription mode", () => {
    assert.equal(STRIPE_CHECKOUT_MODE, "payment");
  });

  it("blocks the dev endpoint in production and with live keys", () => {
    withEnv({ NODE_ENV: "production", VERCEL_ENV: "production" }, () => {
      assert.equal(isStripeDevEndpointAllowed(), false);
    });
    withEnv(
      {
        NODE_ENV: "development",
        STRIPE_SECRET_KEY: "sk_live_abc",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
      },
      () => {
        assert.equal(isStripeDevEndpointAllowed(), false);
      }
    );
  });

  it("404s the Stripe checkout test page in production and when not fully configured", () => {
    withEnv(
      {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        STRIPE_SECRET_KEY: "sk_test_abc123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc123",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
      },
      () => {
        assert.equal(isStripeDevCheckoutTestAllowed(), false);
      }
    );
    withEnv(
      {
        NODE_ENV: "development",
        STRIPE_SECRET_KEY: "sk_test_abc123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc123",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
      },
      () => {
        const previous = process.env.PAYMENTS_ENABLED;
        try {
          delete process.env.PAYMENTS_ENABLED;
          assert.equal(isStripeDevCheckoutTestAllowed(), false);
          process.env.PAYMENTS_ENABLED = "true";
          assert.equal(isStripeDevCheckoutTestAllowed(), true);
        } finally {
          if (previous === undefined) delete process.env.PAYMENTS_ENABLED;
          else process.env.PAYMENTS_ENABLED = previous;
        }
      }
    );
  });

  it("reads Price IDs only from env", () => {
    const previous = process.env.STRIPE_PRICE_PT_SINGLE;
    try {
      delete process.env.STRIPE_PRICE_PT_SINGLE;
      assert.equal(readStripePriceId("session"), null);
      process.env.STRIPE_PRICE_PT_SINGLE = "price_test_session";
      assert.equal(readStripePriceId("session"), "price_test_session");
    } finally {
      if (previous === undefined) delete process.env.STRIPE_PRICE_PT_SINGLE;
      else process.env.STRIPE_PRICE_PT_SINGLE = previous;
    }
  });
});
