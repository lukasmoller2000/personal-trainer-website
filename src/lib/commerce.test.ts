import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateVat,
  canConsumeClip,
  canRefundUnusedClipCard,
  canTransitionOrder,
  CLIP_CARD_EXPIRED_MESSAGE,
  CLIP_LOOKUP_GENERIC_MESSAGE,
  clipCardExpiresAt,
  clipExpiresAt,
  clipStatusAfterConsume,
  COMMERCE_DEFAULTS,
  DEFAULT_REFUND_POLICY,
  effectiveClipCardStatus,
  evaluateClipCardBooking,
  evaluateClipCardPublicView,
  FUTURE_PAYMENT_FLOW,
  getCancellationHours,
  getClipExpiryMonths,
  getCompanyConfig,
  getRefundPolicy,
  getVatSettings,
  getWithdrawalPeriodDays,
  isClipCardExpired,
  isClipCardUsable,
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
  selectUsableClipCardForLookup,
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

function clipCard(overrides: {
  status?: string;
  remaining?: number;
  totalSessions?: number;
  createdAt?: Date | string;
  expiresAt?: Date | string;
} = {}) {
  return {
    status: "active",
    remaining: 5,
    totalSessions: 5,
    ...overrides,
  };
}

describe("clip consume", () => {
  it("consumes one clip and blocks empty cards", () => {
    const ok = canConsumeClip(clipCard());
    assert.equal(ok.ok, true);
    assert.equal(remainingAfterConsume(5), 4);
    assert.equal(clipStatusAfterConsume(0), "exhausted");
    assert.equal(canConsumeClip(clipCard({ remaining: 0 })).ok, false);
    assert.equal(canConsumeClip(clipCard({ status: "cancelled", remaining: 3 })).ok, false);
    const expired = new Date();
    expired.setMonth(expired.getMonth() - 13);
    assert.equal(canConsumeClip(clipCard({ createdAt: expired })).ok, false);
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

describe("clip effective status and expiry", () => {
  const now = new Date("2026-09-20T12:00:00.000Z");
  const futureExpiry = new Date("2027-03-01T10:00:00.000Z");
  const pastExpiry = new Date("2026-01-01T10:00:00.000Z");

  it("treats active cards with a future expiresAt as active", () => {
    assert.equal(effectiveClipCardStatus(clipCard({ expiresAt: futureExpiry }), now), "active");
    assert.equal(isClipCardUsable(clipCard({ expiresAt: futureExpiry }), now), true);
    assert.equal(canConsumeClip(clipCard({ expiresAt: futureExpiry }), now).ok, true);
    assert.equal(evaluateClipCardBooking(clipCard({ expiresAt: futureExpiry }), now).ok, true);
  });

  it("treats stored active cards as expired when expiresAt is in the past", () => {
    const expired = clipCard({ status: "active", expiresAt: pastExpiry });
    assert.equal(effectiveClipCardStatus(expired, now), "expired");
    assert.equal(isClipCardUsable(expired, now), false);
    assert.equal(evaluateClipCardPublicView(expired, now).error, CLIP_CARD_EXPIRED_MESSAGE);
  });

  it("rejects booking and consume on an expired card", () => {
    const expired = clipCard({ expiresAt: pastExpiry });
    const booking = evaluateClipCardBooking(expired, now);
    const consume = canConsumeClip(expired, now);
    assert.equal(booking.ok, false);
    assert.equal(booking.error, CLIP_CARD_EXPIRED_MESSAGE);
    assert.equal(consume.ok, false);
    assert.equal(consume.error, CLIP_CARD_EXPIRED_MESSAGE);
  });

  it("marks remaining 0 as exhausted, not active", () => {
    const used = clipCard({ remaining: 0, expiresAt: futureExpiry });
    assert.equal(effectiveClipCardStatus(used, now), "exhausted");
    assert.equal(canConsumeClip(used, now).ok, false);
    assert.equal(evaluateClipCardBooking(used, now).ok, false);
    assert.equal(evaluateClipCardPublicView(used, now).ok, true);
    assert.equal(evaluateClipCardPublicView(used, now).status, "exhausted");
  });

  it("does not invent an auto-refund just because a pack expired unused", () => {
    const expiredUnused = clipCard({ remaining: 5, totalSessions: 5, expiresAt: pastExpiry });
    assert.equal(effectiveClipCardStatus(expiredUnused, now), "expired");
    assert.equal(canRefundUnusedClipCard(expiredUnused).ok, true);
  });

  it("lets refunded, cancelled and inactive override expiry", () => {
    assert.equal(
      effectiveClipCardStatus(clipCard({ status: "cancelled", expiresAt: pastExpiry }), now),
      "cancelled"
    );
    assert.equal(
      effectiveClipCardStatus(clipCard({ status: "refunded", remaining: 5, expiresAt: futureExpiry }), now),
      "refunded"
    );
    assert.equal(
      effectiveClipCardStatus(clipCard({ status: "inactive", remaining: 4, expiresAt: futureExpiry }), now),
      "inactive"
    );
    assert.equal(canConsumeClip(clipCard({ status: "cancelled", expiresAt: futureExpiry }), now).ok, false);
    assert.equal(evaluateClipCardBooking(clipCard({ status: "refunded" }), now).ok, false);
  });

  it("does not treat an expired card as usable in email lookup", () => {
    const expired = clipCard({
      status: "active",
      remaining: 3,
      expiresAt: pastExpiry,
    });
    const active = clipCard({
      status: "active",
      remaining: 2,
      expiresAt: futureExpiry,
    });
    assert.equal(selectUsableClipCardForLookup([expired], now), null);
    assert.equal(selectUsableClipCardForLookup([expired, active], now), active);
    assert.match(CLIP_LOOKUP_GENERIC_MESSAGE, /aktivt klippekort/);
    assert.equal(isClipCardUsable(expired, now), false);
  });

  it("expires at the exact instant and stays valid one millisecond before", () => {
    const expiresAt = new Date("2027-01-15T10:00:00.000Z");
    const card = clipCard({ expiresAt });
    assert.equal(effectiveClipCardStatus(card, new Date("2027-01-15T09:59:59.999Z")), "active");
    assert.equal(effectiveClipCardStatus(card, new Date(expiresAt)), "expired");
    assert.equal(effectiveClipCardStatus(card, new Date("2027-01-15T10:00:00.001Z")), "expired");
    assert.equal(clipCardExpiresAt(card)?.toISOString(), expiresAt.toISOString());
  });

  it("computes 12-month expiry across a Copenhagen winter/summer boundary", () => {
    const activated = new Date("2026-01-15T10:00:00.000Z");
    const expires = clipExpiresAt(activated, 12);
    const card = clipCard({ createdAt: activated });
    assert.equal(clipCardExpiresAt(card)?.getTime(), expires.getTime());
    assert.equal(effectiveClipCardStatus(card, new Date("2026-06-01T00:00:00.000Z")), "active");
    assert.equal(effectiveClipCardStatus(card, expires), "expired");
    assert.equal(isClipCardExpired(activated, expires), true);
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
  it("exposes official CVR and legal address, not the training venue", () => {
    const company = getCompanyConfig();
    assert.equal(company.name, "Lukas Møller");
    assert.equal(company.cvr, "46738527");
    assert.equal(company.address, "Hedevænget 95, 8800 Viborg");
    assert.ok(company.email.includes("@"));
    assert.match(company.phone, /25 89 04 53/);
    assert.equal(LEGAL_PENDING.COMPANY_CVR, "46738527");
    assert.equal(LEGAL_PENDING.COMPANY_ADDRESS, "Hedevænget 95, 8800 Viborg");
    assert.doesNotMatch(company.cvr, /TODO/i);
    assert.doesNotMatch(company.address, /TODO/i);
    assert.doesNotMatch(company.address, /Falkevej/);
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
