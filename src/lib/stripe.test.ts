import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getStripe, getStripePublishableKey } from "./stripe";

const KEYS = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_MODE",
  "NODE_ENV",
  "VERCEL_ENV",
] as const;

function withEnv(values: Partial<Record<(typeof KEYS)[number], string>>, run: () => void) {
  const env = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(KEYS.map((key) => [key, env[key]]));
  try {
    for (const key of KEYS) {
      const value = values[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
    run();
  } finally {
    for (const key of KEYS) {
      const value = previous[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

describe("Stripe client factory", () => {
  it("does not construct a client from a live secret key in development", () => {
    withEnv(
      {
        NODE_ENV: "development",
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: "sk_live_should_never_construct",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_should_never_construct",
        STRIPE_WEBHOOK_SECRET: "whsec_live",
      },
      () => {
        assert.equal(getStripe(), null);
        assert.equal(getStripePublishableKey(), "");
      }
    );
  });

  it("does not expose a live publishable key in test mode", () => {
    withEnv(
      {
        STRIPE_SECRET_KEY: "sk_test_abc",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_abc",
        STRIPE_WEBHOOK_SECRET: "whsec_abc",
      },
      () => {
        assert.equal(getStripePublishableKey(), "");
      }
    );
  });

  it("does not construct a client from test keys in production live mode", () => {
    withEnv(
      {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: "sk_test_abc",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc",
        STRIPE_WEBHOOK_SECRET: "whsec_test",
      },
      () => {
        assert.equal(getStripe(), null);
        assert.equal(getStripePublishableKey(), "");
      }
    );
  });
});
