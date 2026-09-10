import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { middleware } from "../middleware";
import {
  classifyStripePublishableKey,
  classifyStripeSecretKey,
  evaluateStripeConfig,
  evaluateStripeTestConfig,
  getStripeMode,
  hasLiveStripeKeys,
  isStripeDevCheckoutTestAllowed,
  isStripeDevEndpointAllowed,
  parseStripeSecretKey,
  readStripePriceId,
  STRIPE_CHECKOUT_MODE,
  STRIPE_LIVE_KEYS_REJECTED,
  STRIPE_PRODUCTION_WEBHOOK_URL,
  STRIPE_TEST_KEYS_IN_LIVE_MODE,
} from "./stripe-config";

const KEY_ENV = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_MODE",
  "STRIPE_PRICE_PT_SINGLE",
  "STRIPE_PRICE_LIVE_PT_SINGLE",
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
    assert.equal(STRIPE_PRODUCTION_WEBHOOK_URL, "https://www.lukasmoller.dk/api/stripe/webhook");
  });

  it("blocks the dev endpoint in production and with live keys", () => {
    withEnv({ NODE_ENV: "production", VERCEL_ENV: "production" }, () => {
      assert.equal(isStripeDevEndpointAllowed(), false);
      assert.equal(middleware().status, 404);
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
    withEnv({}, () => {
      assert.equal(readStripePriceId("session"), null);
    });
    withEnv({ STRIPE_PRICE_PT_SINGLE: "price_test_session" }, () => {
      assert.equal(readStripePriceId("session"), "price_test_session");
    });
  });

  it("rejects live keys in development even if STRIPE_MODE=live", () => {
    withEnv(
      {
        NODE_ENV: "development",
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: "sk_live_abc123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc123",
        STRIPE_WEBHOOK_SECRET: "whsec_live",
      },
      () => {
        assert.equal(getStripeMode(), "test");
        const config = evaluateStripeConfig();
        assert.equal(config.ok, false);
        if (config.ok) return;
        assert.equal(config.reason, "live_keys");
        assert.equal(config.error, STRIPE_LIVE_KEYS_REJECTED);
      }
    );
  });

  it("rejects test keys in production when STRIPE_MODE=live", () => {
    withEnv(
      {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: "sk_test_abc123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc123",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
      },
      () => {
        assert.equal(getStripeMode(), "live");
        const config = evaluateStripeConfig();
        assert.equal(config.ok, false);
        if (config.ok) return;
        assert.equal(config.reason, "test_keys");
        assert.equal(config.error, STRIPE_TEST_KEYS_IN_LIVE_MODE);
      }
    );
  });

  it("rejects mk_ and other non-Stripe publishable prefixes as invalid", () => {
    assert.equal(classifyStripePublishableKey("mk_1Rf6Splaceholder_not_a_key"), "invalid");
    assert.equal(classifyStripePublishableKey("pk_live_abc123"), "live");
    assert.equal(classifyStripeSecretKey("sk_live_abc123"), "live");
    withEnv(
      {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: "sk_live_abc123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "mk_1Rf6Splaceholder_not_a_key",
        STRIPE_WEBHOOK_SECRET: "whsec_live",
      },
      () => {
        const config = evaluateStripeConfig();
        assert.equal(config.ok, false);
        if (config.ok) return;
        assert.equal(config.reason, "invalid_keys");
      }
    );
  });

  it("accepts live keys only in production when STRIPE_MODE=live", () => {
    withEnv(
      {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: "sk_live_abc123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc123",
        STRIPE_WEBHOOK_SECRET: "whsec_live",
      },
      () => {
        const config = evaluateStripeConfig();
        assert.equal(config.ok, true);
        if (!config.ok) return;
        assert.equal(config.mode, "live");
        assert.equal(config.secretKey.startsWith("sk_live_"), true);
        assert.equal(config.publishableKey.startsWith("pk_live_"), true);
      }
    );
  });

  it("defaults STRIPE_MODE to test and prefers live Price ID aliases in live mode", () => {
    withEnv({ NODE_ENV: "development" }, () => {
      assert.equal(getStripeMode(), "test");
    });
    withEnv(
      {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        STRIPE_MODE: "live",
        STRIPE_PRICE_PT_SINGLE: "price_test_session",
        STRIPE_PRICE_LIVE_PT_SINGLE: "price_live_session",
      },
      () => {
        assert.equal(readStripePriceId("session"), "price_live_session");
      }
    );
    withEnv(
      {
        NODE_ENV: "development",
        STRIPE_MODE: "live",
        STRIPE_PRICE_PT_SINGLE: "price_test_session",
        STRIPE_PRICE_LIVE_PT_SINGLE: "price_live_session",
      },
      () => {
        assert.equal(readStripePriceId("session"), "price_test_session");
      }
    );
  });
});
