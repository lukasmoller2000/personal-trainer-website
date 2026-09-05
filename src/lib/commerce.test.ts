import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateVat,
  canConsumeClip,
  canRefundUnusedClipCard,
  canTransitionOrder,
  clipExpiresAt,
  clipStatusAfterConsume,
  COMMERCE_DEFAULTS,
  DEFAULT_REFUND_POLICY,
  FUTURE_PAYMENT_FLOW,
  getCancellationHours,
  getClipExpiryMonths,
  getCompanyConfig,
  getRefundPolicy,
  getVatSettings,
  getWithdrawalPeriodDays,
  isClipCardExpired,
  isPaymentsEnabledByFlag,
  isPaymentsReady,
  isStripeEnabled,
  isUniqueConstraintError,
  LEGAL_PENDING,
  ONLINE_CANCEL_REQUIRED_IF_SUBSCRIPTION,
  PAYMENTS_NOT_CONFIGURED,
  paymentsNotConfiguredMessage,
  remainingAfterConsume,
  rememberEventId,
  sessionDuration,
} from "./commerce";

describe("VAT config", () => {
  it("does not apply VAT unless the business is registered", () => {
    const settings = {
      ...getVatSettings(),
      registered: false,
    };
    const result = calculateVat(30000, settings, "session");
    assert.equal(result.vatApplied, false);
    assert.equal(result.vatAmountOre, 0);
    assert.equal(result.chargeOre, 30000);
  });

  it("can split inclusive VAT when registered", () => {
    const result = calculateVat(
      30000,
      {
        registered: true,
        ratePercent: 25,
        pricesIncludeVat: true,
        collectBirthYear: false,
        exemptUnderAge: 0,
        taxableProductIds: ["session"],
      },
      "session"
    );
    assert.equal(result.vatApplied, true);
    assert.equal(result.chargeOre, 30000);
    assert.equal(result.vatAmountOre, 6000);
    assert.equal(result.vatRatePercent, 25);
  });

  it("can exempt under-age customers when configured", () => {
    const year = new Date().getFullYear() - 16;
    const result = calculateVat(
      30000,
      {
        registered: true,
        ratePercent: 25,
        pricesIncludeVat: true,
        collectBirthYear: true,
        exemptUnderAge: 18,
        taxableProductIds: ["session"],
      },
      "session",
      year
    );
    assert.equal(result.vatApplied, false);
    assert.equal(result.vatAmountOre, 0);
  });
});

describe("clip consume", () => {
  it("consumes one clip and blocks empty cards", () => {
    const ok = canConsumeClip({ status: "active", remaining: 5, totalSessions: 5 });
    assert.equal(ok.ok, true);
    assert.equal(remainingAfterConsume(5), 4);
    assert.equal(clipStatusAfterConsume(0), "exhausted");
    assert.equal(canConsumeClip({ status: "active", remaining: 0, totalSessions: 5 }).ok, false);
    assert.equal(canConsumeClip({ status: "cancelled", remaining: 3, totalSessions: 5 }).ok, false);
    const expired = new Date();
    expired.setMonth(expired.getMonth() - 13);
    assert.equal(
      canConsumeClip({
        status: "active",
        remaining: 5,
        totalSessions: 5,
        createdAt: expired,
      }).ok,
      false
    );
  });

  it("only refunds unused packs", () => {
    assert.equal(
      canRefundUnusedClipCard({ status: "active", remaining: 5, totalSessions: 5 }).ok,
      true
    );
    assert.equal(
      canRefundUnusedClipCard({ status: "active", remaining: 4, totalSessions: 5 }).ok,
      false
    );
  });
});

describe("webhook idempotency", () => {
  it("treats a seen Stripe event id as a duplicate", () => {
    const seen = new Set(["evt_1"]);
    assert.equal(rememberEventId(seen, "evt_1"), "duplicate");
    assert.equal(rememberEventId(seen, "evt_2"), "new");
  });

  it("detects Prisma unique constraint errors", () => {
    assert.equal(isUniqueConstraintError({ code: "P2002" }), true);
    assert.equal(isUniqueConstraintError(new Error("fail")), false);
  });

  it("does not pay an order twice", () => {
    assert.equal(canTransitionOrder("pending", "paid"), true);
    assert.equal(canTransitionOrder("paid", "paid"), false);
    assert.equal(canTransitionOrder("paid", "refunded"), true);
    assert.equal(canTransitionOrder("refunded", "paid"), false);
  });
});

describe("session duration", () => {
  it("describes about 60 minutes without promising extra time", () => {
    assert.equal(sessionDuration.minutes, 60);
    assert.match(sessionDuration.copy, /ca\. 60 minutter/);
    assert.match(sessionDuration.copy, /stopuret/);
    assert.match(sessionDuration.notAPromise, /ikke et løfte/);
  });
});

describe("payments", () => {
  it("stays dormant unless PAYMENTS_ENABLED is set", () => {
    assert.equal(isPaymentsEnabledByFlag(), false);
    assert.equal(isStripeEnabled(), false);
    assert.equal(isStripeEnabled(), isPaymentsEnabledByFlag());
    assert.equal(isPaymentsReady(), false);
    assert.match(paymentsNotConfiguredMessage(), /ikke aktiveret/);
    assert.equal(PAYMENTS_NOT_CONFIGURED.includes("ikke aktiveret"), true);
  });

  it("documents the future pay-after-confirm flow without enabling it", () => {
    assert.deepEqual(FUTURE_PAYMENT_FLOW, [
      "choose_product",
      "request_time",
      "time_confirmed",
      "customer_pays",
      "stripe_checkout",
      "webhook_confirms",
      "booking_marked_paid",
    ]);
  });
});

describe("company and legal config", () => {
  it("hides empty CVR and address and keeps payments off", () => {
    const company = getCompanyConfig();
    assert.equal(company.name, "Lukas Møller");
    assert.equal(company.cvr, "");
    assert.equal(company.address, "");
    assert.ok(company.email.includes("@"));
    assert.equal(LEGAL_PENDING.COMPANY_CVR, "");
    assert.equal(LEGAL_PENDING.COMPANY_ADDRESS, "");
    assert.doesNotMatch(company.cvr, /TODO/i);
    assert.doesNotMatch(company.address, /TODO/i);
    assert.equal(isPaymentsEnabledByFlag(), false);
    assert.equal(isStripeEnabled(), false);
  });

  it("computes 12-month clip expiry from activation", () => {
    const activated = new Date("2026-01-15T10:00:00.000Z");
    const expires = clipExpiresAt(activated, 12);
    assert.equal(expires.getUTCFullYear(), 2027);
    assert.equal(expires.getUTCMonth(), 0);
    assert.equal(isClipCardExpired(activated, new Date("2026-06-01T00:00:00.000Z")), false);
    assert.equal(isClipCardExpired(activated, new Date("2027-01-15T10:00:00.000Z")), true);
  });

  it("uses 12-month clip expiry and 24-hour cancellation", () => {
    assert.equal(COMMERCE_DEFAULTS.CLIP_EXPIRY_MONTHS, 12);
    assert.equal(COMMERCE_DEFAULTS.CANCELLATION_HOURS, 24);
    assert.equal(getClipExpiryMonths(), 12);
    assert.equal(getCancellationHours(), 24);
    assert.equal(getWithdrawalPeriodDays(), 14);
    assert.equal(ONLINE_CANCEL_REQUIRED_IF_SUBSCRIPTION, true);
  });

  it("assesses refunds from statutory rights and agreed terms, not a blanket ban", () => {
    const policy = getRefundPolicy();
    assert.equal(policy, DEFAULT_REFUND_POLICY);
    assert.match(policy, /lovbestemte rettigheder/);
    assert.match(policy, /afbuds- og klipvilkår/);
    assert.doesNotMatch(policy, /ingen refundering/i);
    assert.doesNotMatch(policy, /under no circumstances/i);
  });
});

describe("clip expiry env", () => {
  it("shows 12 months when CLIP_EXPIRY_MONTHS is set", () => {
    const previous = process.env.CLIP_EXPIRY_MONTHS;
    try {
      process.env.CLIP_EXPIRY_MONTHS = "12";
      assert.equal(getClipExpiryMonths(), 12);
    } finally {
      if (previous === undefined) delete process.env.CLIP_EXPIRY_MONTHS;
      else process.env.CLIP_EXPIRY_MONTHS = previous;
    }
  });
});
