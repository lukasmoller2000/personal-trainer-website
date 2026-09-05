import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchStripePaymentToCatalog,
  planClipCardActivation,
  safeCheckoutMetadata,
  verifyStripeWebhookSignature,
} from "./stripe-fulfillment";

const PRICE_ENV = [
  "STRIPE_PRICE_PT_SINGLE",
  "STRIPE_PRICE_PT_5_CLIP",
  "STRIPE_PRICE_ONLINE_COACHING",
] as const;

function withPriceEnv(values: Partial<Record<(typeof PRICE_ENV)[number], string>>, run: () => void) {
  const previous = Object.fromEntries(PRICE_ENV.map((key) => [key, process.env[key]]));
  try {
    for (const key of PRICE_ENV) {
      const value = values[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    run();
  } finally {
    for (const key of PRICE_ENV) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("Stripe payment matching", () => {
  it("accepts a session that matches the catalog and ignores metadata amounts", () => {
    withPriceEnv({ STRIPE_PRICE_PT_5_CLIP: "price_test_pack" }, () => {
      const match = matchStripePaymentToCatalog("pack-5", {
        paymentStatus: "paid",
        amountTotal: 135000,
        currency: "dkk",
        priceIds: ["price_test_pack"],
        metadataAmount: 1,
      });
      assert.equal(match.ok, true);
      if (!match.ok) return;
      assert.equal(match.amountOre, 135000);
      assert.equal(match.currency, "dkk");
    });
  });

  it("rejects the wrong Stripe amount or currency as unpaid", () => {
    withPriceEnv({ STRIPE_PRICE_PT_SINGLE: "price_test_session" }, () => {
      const amount = matchStripePaymentToCatalog("session", {
        paymentStatus: "paid",
        amountTotal: 1,
        currency: "dkk",
        priceIds: ["price_test_session"],
      });
      assert.equal(amount.ok, false);
      if (amount.ok) return;
      assert.equal(amount.reason, "amount_mismatch");

      const currency = matchStripePaymentToCatalog("session", {
        paymentStatus: "paid",
        amountTotal: 30000,
        currency: "usd",
        priceIds: ["price_test_session"],
      });
      assert.equal(currency.ok, false);
      if (currency.ok) return;
      assert.equal(currency.reason, "currency_mismatch");
    });
  });

  it("rejects an unknown productId", () => {
    const match = matchStripePaymentToCatalog("pack-10", {
      paymentStatus: "paid",
      amountTotal: 30000,
      currency: "dkk",
    });
    assert.equal(match.ok, false);
    if (match.ok) return;
    assert.equal(match.reason, "unknown_product");
  });

  it("rejects online coaching until its payment model is decided", () => {
    withPriceEnv({ STRIPE_PRICE_ONLINE_COACHING: "price_test_online" }, () => {
      const match = matchStripePaymentToCatalog("online", {
        paymentStatus: "paid",
        amountTotal: 79900,
        currency: "dkk",
        priceIds: ["price_test_online"],
      });
      assert.equal(match.ok, false);
      if (match.ok) return;
      assert.equal(match.reason, "unknown_product");
    });
  });
});

describe("clip activation", () => {
  it("creates exactly 5 clips for a 5-clip purchase", () => {
    const plan = planClipCardActivation({ productId: "pack-5", alreadyHasCard: false });
    assert.equal(plan.action, "create");
    if (plan.action !== "create") return;
    assert.equal(plan.totalSessions, 5);
    assert.equal(plan.remaining, 5);
  });

  it("does not add more clips on replay", () => {
    const replay = planClipCardActivation({ productId: "pack-5", alreadyHasCard: true });
    assert.equal(replay.action, "skip");
    if (replay.action !== "skip") return;
    assert.equal(replay.reason, "already_active");
  });

  it("does not create clips for PT single or online", () => {
    assert.equal(planClipCardActivation({ productId: "session", alreadyHasCard: false }).action, "skip");
    assert.equal(planClipCardActivation({ productId: "online", alreadyHasCard: false }).action, "skip");
  });
});

describe("webhook signature", () => {
  it("rejects a missing or invalid signature", () => {
    const missing = verifyStripeWebhookSignature({
      payload: "{}",
      signature: null,
      secret: "whsec_test",
      constructEvent: () => {
        throw new Error("should not run");
      },
    });
    assert.equal(missing.ok, false);
    if (missing.ok) return;
    assert.match(missing.error, /underskrift/);

    const invalid = verifyStripeWebhookSignature({
      payload: "{}",
      signature: "t=1,v1=bad",
      secret: "whsec_test",
      constructEvent: () => {
        throw new Error("invalid");
      },
    });
    assert.equal(invalid.ok, false);
    if (invalid.ok) return;
    assert.equal(invalid.error, "Ugyldig underskrift");
  });

  it("treats a verified constructEvent as accepted", () => {
    const verified = verifyStripeWebhookSignature({
      payload: "{}",
      signature: "t=1,v1=ok",
      secret: "whsec_test",
      constructEvent: () => ({ id: "evt_test" }),
    });
    assert.equal(verified.ok, true);
    if (!verified.ok) return;
    assert.equal(verified.event.id, "evt_test");
  });
});

describe("checkout metadata", () => {
  it("only stores safe identifiers and never a client amount", () => {
    const metadata = safeCheckoutMetadata({
      productId: "pack-5",
      orderId: "ord_1",
      bookingId: "book_1",
    });
    assert.equal(metadata.productId, "pack-5");
    assert.equal(metadata.orderId, "ord_1");
    assert.equal(metadata.requestId, "ord_1");
    assert.equal(metadata.bookingId, "book_1");
    assert.equal("amount" in metadata, false);
    assert.equal("notes" in metadata, false);
    assert.equal("goal" in metadata, false);
  });
});
