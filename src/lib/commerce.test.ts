import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateVat,
  canConsumeClip,
  canRefundUnusedClipCard,
  canTransitionOrder,
  clipStatusAfterConsume,
  getVatSettings,
  isPaymentsReady,
  isUniqueConstraintError,
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
    assert.equal(isPaymentsReady(), false);
  });
});
