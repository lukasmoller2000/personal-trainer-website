import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHECKOUT_AMOUNTS_ORE,
  expectedAmountOreForTier,
  resolveCheckoutPrice,
  standardCheckoutAmountOre,
} from "./checkout-price";
import { evaluateCheckoutStart } from "./checkout-guard";
import { rememberEventId } from "./commerce";
import { resolveCheckoutAmountOre } from "./products";
import {
  buildStripeCheckoutLineItem,
  matchStripePaymentToCatalog,
} from "./stripe-fulfillment";

const PAYMENT_ENV = [
  "PAYMENTS_ENABLED",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_MODE",
  "DATABASE_URL",
  "STRIPE_PRICE_PT_SINGLE",
  "STRIPE_PRICE_PT_5_CLIP",
  "STRIPE_PRICE_PT_SINGLE_VFG",
  "STRIPE_PRICE_PT_5_CLIP_VFG",
  "NODE_ENV",
  "VERCEL_ENV",
] as const;

function withPaymentEnv(values: Partial<Record<(typeof PAYMENT_ENV)[number], string>>, run: () => void) {
  const env = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(PAYMENT_ENV.map((key) => [key, env[key]]));
  try {
    for (const key of PAYMENT_ENV) {
      const value = values[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
    run();
  } finally {
    for (const key of PAYMENT_ENV) {
      const value = previous[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
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
} as const;

describe("resolveCheckoutPrice", () => {
  it("uses 25000 for an active PT member and 30000 otherwise", () => {
    assert.equal(resolveCheckoutPrice({ productId: "session", isVfgMember: true })?.amountOre, 25000);
    assert.equal(resolveCheckoutPrice({ productId: "session", isVfgMember: false })?.amountOre, 30000);
    assert.equal(resolveCheckoutPrice({ productId: "session" })?.amountOre, 30000);
    assert.equal(CHECKOUT_AMOUNTS_ORE.session.vfg_member, 25000);
    assert.equal(CHECKOUT_AMOUNTS_ORE.session.standard, 30000);
  });

  it("uses 115000 for an active 5-pack member and 135000 otherwise", () => {
    assert.equal(resolveCheckoutPrice({ productId: "pack-5", isVfgMember: true })?.amountOre, 115000);
    assert.equal(resolveCheckoutPrice({ productId: "pack-5", isVfgMember: false })?.amountOre, 135000);
    assert.equal(resolveCheckoutPrice({ productId: "pack-5" })?.amountOre, 135000);
  });

  it("treats lookup failure / unverified as standard", () => {
    assert.equal(standardCheckoutAmountOre("session"), 30000);
    assert.equal(standardCheckoutAmountOre("pack-5"), 135000);
    assert.equal(expectedAmountOreForTier("session", "vfg_member", false), 30000);
    assert.equal(expectedAmountOreForTier("pack-5", "vfg_member", false), 135000);
    assert.equal(expectedAmountOreForTier("session", "standard", true), 30000);
    assert.equal(resolveCheckoutAmountOre("session", 1, false), 30000);
    assert.equal(resolveCheckoutAmountOre("pack-5", 1, false), 135000);
  });

  it("does not invent a member price for online coaching", () => {
    assert.equal(resolveCheckoutPrice({ productId: "online", isVfgMember: true }), null);
    assert.equal(resolveCheckoutAmountOre("online", 1, true), null);
  });
});

describe("client pricing cannot select VFG", () => {
  it("ignores fake isMember=true and fake amount=1", () => {
    withPaymentEnv(validTestEnv, () => {
      const result = evaluateCheckoutStart({
        productId: "session",
        clientAmount: 1,
        isMember: true,
        isVfgMember: true,
        priceTier: "vfg_member",
        earlyPerformanceRequested: true,
      });
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.amountOre, 30000);
      assert.equal(result.priceTier, "standard");
      assert.equal(result.usePriceData, false);
    });
  });

  it("charges member amounts only from serverVerifiedVfgMember", () => {
    withPaymentEnv(validTestEnv, () => {
      const session = evaluateCheckoutStart({
        productId: "session",
        clientAmount: 1,
        isMember: false,
        serverVerifiedVfgMember: true,
        earlyPerformanceRequested: true,
      });
      assert.equal(session.ok, true);
      if (!session.ok) return;
      assert.equal(session.amountOre, 25000);
      assert.equal(session.priceTier, "vfg_member");
      assert.equal(session.usePriceData, true);

      const pack = evaluateCheckoutStart({
        productId: "pack-5",
        serverVerifiedVfgMember: true,
        earlyPerformanceRequested: true,
      });
      assert.equal(pack.ok, true);
      if (!pack.ok) return;
      assert.equal(pack.amountOre, 115000);
      assert.equal(pack.usePriceData, true);
    });
  });
});

describe("webhook member amounts", () => {
  it("accepts the correct member amount and rejects the wrong one", () => {
    const memberOk = matchStripePaymentToCatalog(
      "session",
      {
        paymentStatus: "paid",
        amountTotal: 25000,
        currency: "dkk",
      },
      { priceTier: "vfg_member", vfgMemberVerified: true, chargedAmountOre: 25000 }
    );
    assert.equal(memberOk.ok, true);
    if (!memberOk.ok) return;
    assert.equal(memberOk.amountOre, 25000);

    const packOk = matchStripePaymentToCatalog(
      "pack-5",
      {
        paymentStatus: "paid",
        amountTotal: 115000,
        currency: "dkk",
      },
      { priceTier: "vfg_member", vfgMemberVerified: true, chargedAmountOre: 115000 }
    );
    assert.equal(packOk.ok, true);

    const wrong = matchStripePaymentToCatalog(
      "session",
      {
        paymentStatus: "paid",
        amountTotal: 30000,
        currency: "dkk",
      },
      { priceTier: "vfg_member", vfgMemberVerified: true, chargedAmountOre: 25000 }
    );
    assert.equal(wrong.ok, false);
    if (wrong.ok) return;
    assert.equal(wrong.reason, "amount_mismatch");
  });

  it("rejects a member charge when membership was not verified", () => {
    const match = matchStripePaymentToCatalog(
      "session",
      {
        paymentStatus: "paid",
        amountTotal: 25000,
        currency: "dkk",
        priceIds: ["price_test_session"],
      },
      { priceTier: "vfg_member", vfgMemberVerified: false, chargedAmountOre: 30000 }
    );
    assert.equal(match.ok, false);
    if (match.ok) return;
    assert.equal(match.reason, "amount_mismatch");
  });

  it("keeps replay/idempotency semantics", () => {
    const seen = new Set<string>(["evt_member_1"]);
    assert.equal(rememberEventId(seen, "evt_member_1"), "duplicate");
    assert.equal(rememberEventId(seen, "evt_member_2"), "new");

    const first = matchStripePaymentToCatalog(
      "pack-5",
      { paymentStatus: "paid", amountTotal: 115000, currency: "dkk" },
      { priceTier: "vfg_member", vfgMemberVerified: true, chargedAmountOre: 115000 }
    );
    const replay = matchStripePaymentToCatalog(
      "pack-5",
      { paymentStatus: "paid", amountTotal: 115000, currency: "dkk" },
      { priceTier: "vfg_member", vfgMemberVerified: true, chargedAmountOre: 115000 }
    );
    assert.equal(first.ok, true);
    assert.equal(replay.ok, true);
  });
});

describe("Stripe line items", () => {
  it("uses price_data for member amounts when no member Price ID exists", () => {
    const item = buildStripeCheckoutLineItem({
      productName: "Personlig træning",
      amountOre: 25000,
      stripePriceId: "price_test_session",
      memberStripePriceId: null,
      priceTier: "vfg_member",
      usePriceData: true,
    });
    assert.equal("price_data" in item, true);
    if (!("price_data" in item)) return;
    assert.equal(item.price_data.unit_amount, 25000);
    assert.equal(item.price_data.currency, "dkk");
  });

  it("keeps the catalog Price ID for standard checkout", () => {
    const item = buildStripeCheckoutLineItem({
      productName: "Personlig træning",
      amountOre: 30000,
      stripePriceId: "price_test_session",
      priceTier: "standard",
      usePriceData: false,
    });
    assert.deepEqual(item, { quantity: 1, price: "price_test_session" });
  });
});
