import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getStripe, getStripePublishableKey } from "./stripe";

describe("Stripe client factory", () => {
  it("does not construct a client from a live secret key", () => {
    const previous = process.env.STRIPE_SECRET_KEY;
    try {
      process.env.STRIPE_SECRET_KEY = "sk_live_should_never_construct";
      assert.equal(getStripe(), null);
    } finally {
      if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = previous;
    }
  });

  it("does not expose a live publishable key", () => {
    const previousSecret = process.env.STRIPE_SECRET_KEY;
    const previousPk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const previousWh = process.env.STRIPE_WEBHOOK_SECRET;
    try {
      process.env.STRIPE_SECRET_KEY = "sk_test_abc";
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_abc";
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc";
      assert.equal(getStripePublishableKey(), "");
    } finally {
      if (previousSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = previousSecret;
      if (previousPk === undefined) delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      else process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = previousPk;
      if (previousWh === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
      else process.env.STRIPE_WEBHOOK_SECRET = previousWh;
    }
  });
});
