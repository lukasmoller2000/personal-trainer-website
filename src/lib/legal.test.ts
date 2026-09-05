import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTermsCopy } from "./legal";

describe("terms copy", () => {
  it("renders company info without empty CVR or address placeholders", () => {
    const terms = getTermsCopy();

    assert.equal(terms.cvr, "");
    assert.equal(terms.address, "");
    assert.equal(terms.companyName, "Lukas Møller");
    assert.ok(terms.email.includes("@"));
    assert.doesNotMatch(JSON.stringify(terms), /TODO/i);
    assert.doesNotMatch(terms.trainingAddress, /CVR/);
  });

  it("shows 12-month clip expiry when config is set and 24-hour cancellation", () => {
    const previous = process.env.CLIP_EXPIRY_MONTHS;
    try {
      process.env.CLIP_EXPIRY_MONTHS = "12";
      const terms = getTermsCopy();
      assert.equal(terms.clipExpiryMonths, 12);
      assert.match(terms.clipExpiry, /12 måneder/);
      assert.equal(terms.cancellationHours, 24);
      assert.match(terms.cancellation, /24 timer/);
      assert.match(terms.cancellation, /kun for bekræftede tider/);
    } finally {
      if (previous === undefined) delete process.env.CLIP_EXPIRY_MONTHS;
      else process.env.CLIP_EXPIRY_MONTHS = previous;
    }
  });

  it("states late cancel and no-show as used-as-a-starting-point, not absolute forfeiture", () => {
    const terms = getTermsCopy();
    assert.match(terms.lateCancel, /bekræftet PT-session/);
    assert.match(terms.lateCancel, /som udgangspunkt som brugt/);
    assert.match(terms.lateCancel, /ét klip/);
    assert.match(terms.lateCancel, /som udgangspunkt ikke/);
    assert.match(terms.lateCancel, /ufravigelige rettigheder/);
    assert.match(terms.noShow, /samme udgangspunkt som sent afbud/);
    assert.match(terms.noShow, /ét klip/);
    assert.doesNotMatch(terms.lateCancel, /under ingen omstændigheder/);
    assert.doesNotMatch(terms.noShow, /mister altid/);
  });

  it("has no general ingen-refundering rule", () => {
    const terms = getTermsCopy();
    const blob = `${terms.refund} ${terms.lateCancel} ${terms.noShow}`;
    assert.match(terms.refund, /lovbestemte rettigheder/);
    assert.match(terms.refund, /afbuds- og klipvilkår/);
    assert.doesNotMatch(blob, /ingen refundering/i);
    assert.doesNotMatch(terms.refund, /aldrig refunderes/);
  });

  it("explains 14-day withdrawal for online service purchase without auto-waiver", () => {
    const terms = getTermsCopy();
    assert.equal(terms.withdrawalDays, 14);
    assert.match(terms.withdrawal, /14 dages fortrydelsesret/);
    assert.match(terms.withdrawal, /online køb af tjenesteydelser/);
    assert.match(terms.withdrawal, /bortfalder ikke automatisk/);
    assert.match(terms.withdrawal, /udtrykkelige ønske/);
    assert.doesNotMatch(terms.withdrawal, /fortrydes altid/);
    assert.doesNotMatch(terms.withdrawal, / mister automatisk /);
    assert.doesNotMatch(terms.withdrawal, /fraskrevet/);
  });

  it("keeps payments off and does not block a later online-cancel path", () => {
    const terms = getTermsCopy();
    assert.equal(terms.paymentsEnabled, false);
    assert.match(terms.inquiryNotAgreement, /ikke en endelig aftale/);
    assert.match(terms.online, /forespørgsel/);
    assert.match(terms.online, /skrive eller ringe/);
    assert.match(terms.online, /opsige online/);
    assert.equal(terms.onlineCancelRequiredIfSubscription, true);
    assert.doesNotMatch(terms.online, /kan ikke opsiges/);
  });
});
