import { createHmac } from "crypto";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOKING_STATUS,
  PAYMENT_LINK_TTL_HOURS,
  blocksTimeslot,
  bookingStatusAfterCheckoutExpired,
  bookingStatusAfterPaid,
  bookingStatusAfterRefund,
  buildConfirmCustomerEmail,
  buildFailedPaymentCustomerEmail,
  buildRejectCustomerEmail,
  canConfirmSessionInquiry,
  canRejectSessionBooking,
  canResendPaymentLink,
  createBookingPaymentLinkToken,
  evaluateSessionCheckoutBinding,
  evaluateSessionPayment,
  paymentLinkExpiresAt,
  resolveFailedPaymentRetryUrl,
  sessionCheckoutAmountOre,
  shouldSendDecisionEmail,
  verifyBookingPaymentLinkToken,
} from "./booking-payment";
import { sessionStartAt } from "./commerce";
import { resolveCheckoutAmountOre, startsCheckoutFromPublicForm, getProduct } from "./products";
import { evaluateCheckoutStart } from "./checkout-guard";

const SECRET_KEYS = ["ADMIN_PASSWORD", "BOOKING_PAY_SECRET"] as const;

function withSecret(run: () => void) {
  const env = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(SECRET_KEYS.map((key) => [key, env[key]]));
  try {
    env.ADMIN_PASSWORD = "test-admin-password";
    delete env.BOOKING_PAY_SECRET;
    run();
  } finally {
    for (const key of SECRET_KEYS) {
      const value = previous[key];
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

const inquiry = {
  id: "11111111-1111-1111-1111-111111111111",
  productId: "session",
  status: BOOKING_STATUS.inquiry,
  date: "2099-06-02",
  time: "07:00",
  name: "Test",
  email: "test@example.com",
};

function paymentToken(
  bookingId = inquiry.id,
  now?: Date,
  times: { date: string; time: string } = { date: inquiry.date!, time: inquiry.time! }
) {
  return createBookingPaymentLinkToken(bookingId, { ...times, now });
}

function legacyV1Token(bookingId: string) {
  const secret = process.env.BOOKING_PAY_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || "";
  const mac = createHmac("sha256", secret).update(`booking-pay-v1:${bookingId}`).digest("hex");
  return `${bookingId}.${mac}`;
}

describe("PT inquiry stays unpaid", () => {
  it("creates an inquiry that cannot start payment", () => {
    assert.equal(canConfirmSessionInquiry(inquiry).ok, true);
    const pay = evaluateSessionPayment(inquiry);
    assert.equal(pay.ok, false);
    if (pay.ok) return;
    assert.equal(pay.reason, "unconfirmed");
  });
});

describe("session payment eligibility", () => {
  it("rejects an unconfirmed booking", () => {
    const result = evaluateSessionPayment(inquiry);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "unconfirmed");
  });

  it("allows a confirmed booking awaiting payment", () => {
    const result = evaluateSessionPayment({
      ...inquiry,
      status: BOOKING_STATUS.awaitingPayment,
    });
    assert.equal(result.ok, true);
  });

  it("rejects the wrong booking id or token", () => {
    withSecret(() => {
      const missing = evaluateSessionCheckoutBinding({ productId: "session" });
      assert.equal(missing.ok, false);
      if (missing.ok) return;
      assert.equal(missing.reason, "missing_token");

      const invalid = evaluateSessionCheckoutBinding({
        productId: "session",
        paymentToken: "not-a-real-token",
      });
      assert.equal(invalid.ok, false);
      if (invalid.ok) return;
      assert.equal(invalid.reason, "invalid_token");

      const forged = evaluateSessionCheckoutBinding({
        productId: "session",
        paymentToken: `${inquiry.id}.deadbeef`,
      });
      assert.equal(forged.ok, false);
      if (forged.ok) return;
      assert.equal(forged.reason, "invalid_token");

      assert.equal(verifyBookingPaymentLinkToken("wrong.token").ok, false);
    });
  });

  it("accepts a signed token for the confirmed booking", () => {
    withSecret(() => {
      const now = new Date("2026-09-20T12:00:00.000Z");
      const token = paymentToken(inquiry.id, now);
      const verified = verifyBookingPaymentLinkToken(token, now);
      assert.equal(verified.ok, true);
      if (!verified.ok) return;
      assert.equal(verified.bookingId, inquiry.id);

      const bound = evaluateSessionCheckoutBinding({
        productId: "session",
        paymentToken: token,
        clientAmount: 1,
        now,
      });
      assert.equal(bound.ok, true);
      if (!bound.ok) return;
      assert.equal(bound.bookingId, inquiry.id);
    });
  });

  it("ignores a client-supplied price and keeps 300 kr", () => {
    assert.equal(sessionCheckoutAmountOre(), 30000);
    assert.equal(resolveCheckoutAmountOre("session", 1), 30000);
    assert.equal(resolveCheckoutAmountOre("session", 999999), 30000);
    withSecret(() => {
      const now = new Date("2026-09-20T12:00:00.000Z");
      const token = paymentToken(inquiry.id, now);
      const bound = evaluateSessionCheckoutBinding({
        productId: "session",
        paymentToken: token,
        clientAmount: 1,
        now,
      });
      assert.equal(bound.ok, true);
    });
  });

  it("does not allow the same booking to pay twice", () => {
    const paid = evaluateSessionPayment({
      ...inquiry,
      status: BOOKING_STATUS.confirmed,
    });
    assert.equal(paid.ok, false);
    if (paid.ok) return;
    assert.equal(paid.reason, "already_paid");

    const paidOrder = evaluateSessionPayment({
      ...inquiry,
      status: BOOKING_STATUS.awaitingPayment,
      orderStatus: "paid",
    });
    assert.equal(paidOrder.ok, false);
    if (paidOrder.ok) return;
    assert.equal(paidOrder.reason, "already_paid");

    const inProgress = evaluateSessionPayment(
      {
        ...inquiry,
        status: BOOKING_STATUS.hold,
        holdUntil: new Date(Date.now() + 10 * 60 * 1000),
      },
      new Date()
    );
    assert.equal(inProgress.ok, false);
    if (inProgress.ok) return;
    assert.equal(inProgress.reason, "in_progress");
  });
});

describe("webhook booking fulfillment", () => {
  it("marks a held or awaiting booking as paid", () => {
    assert.equal(bookingStatusAfterPaid(BOOKING_STATUS.hold), BOOKING_STATUS.confirmed);
    assert.equal(
      bookingStatusAfterPaid(BOOKING_STATUS.awaitingPayment),
      BOOKING_STATUS.confirmed
    );
  });

  it("is idempotent on replay", () => {
    assert.equal(bookingStatusAfterPaid(BOOKING_STATUS.confirmed), BOOKING_STATUS.confirmed);
    assert.equal(
      bookingStatusAfterPaid(bookingStatusAfterPaid(BOOKING_STATUS.hold)),
      BOOKING_STATUS.confirmed
    );
  });

  it("returns a confirmed booking to awaiting payment if checkout expires", () => {
    assert.equal(
      bookingStatusAfterCheckoutExpired(BOOKING_STATUS.hold),
      BOOKING_STATUS.awaitingPayment
    );
    assert.equal(
      bookingStatusAfterCheckoutExpired(BOOKING_STATUS.confirmed),
      BOOKING_STATUS.confirmed
    );
  });

  it("cancels a paid PT booking after refund without dropping rejected or no-show history", () => {
    assert.equal(bookingStatusAfterRefund(BOOKING_STATUS.confirmed), BOOKING_STATUS.cancelled);
    assert.equal(bookingStatusAfterRefund(BOOKING_STATUS.hold), BOOKING_STATUS.cancelled);
    assert.equal(bookingStatusAfterRefund(BOOKING_STATUS.cancelled), BOOKING_STATUS.cancelled);
    assert.equal(bookingStatusAfterRefund(BOOKING_STATUS.rejected), BOOKING_STATUS.rejected);
    assert.equal(bookingStatusAfterRefund(BOOKING_STATUS.noShow), BOOKING_STATUS.noShow);
  });
});

describe("5-clip and online coaching stay unchanged", () => {
  it("lets pack-5 start public checkout and keeps online without Stripe", () => {
    const session = getProduct("session");
    const pack = getProduct("pack-5");
    const online = getProduct("online");
    assert.ok(session);
    assert.ok(pack);
    assert.ok(online);
    assert.equal(startsCheckoutFromPublicForm(session), false);
    assert.equal(startsCheckoutFromPublicForm(pack), true);
    assert.equal(startsCheckoutFromPublicForm(online), false);
    assert.equal(online.paymentsAvailable, false);
    assert.equal(resolveCheckoutAmountOre("pack-5", 1), 135000);
    assert.equal(resolveCheckoutAmountOre("online", 1), null);

    const onlineCheckout = evaluateCheckoutStart({
      productId: "online",
      earlyPerformanceRequested: true,
    });
    assert.equal(onlineCheckout.ok, false);
  });
});

describe("booking decision mail", () => {
  it("sends mail only on the correct state change", () => {
    assert.equal(shouldSendDecisionEmail("confirm", BOOKING_STATUS.inquiry), true);
    assert.equal(shouldSendDecisionEmail("confirm", BOOKING_STATUS.awaitingPayment), false);
    assert.equal(shouldSendDecisionEmail("confirm", BOOKING_STATUS.confirmed), false);
    assert.equal(shouldSendDecisionEmail("reject", BOOKING_STATUS.inquiry), true);
    assert.equal(shouldSendDecisionEmail("reject", BOOKING_STATUS.awaitingPayment), true);
    assert.equal(shouldSendDecisionEmail("reject", BOOKING_STATUS.rejected), false);
    assert.equal(shouldSendDecisionEmail("reject", BOOKING_STATUS.confirmed), false);
    assert.equal(shouldSendDecisionEmail("resend", BOOKING_STATUS.awaitingPayment), true);
    assert.equal(shouldSendDecisionEmail("resend", BOOKING_STATUS.inquiry), false);
  });

  it("includes date, 300 kr and payment URL on confirm — not on reject", () => {
    withSecret(() => {
      const token = paymentToken();
      const confirm = buildConfirmCustomerEmail({
        name: "Test",
        date: "2099-06-02",
        time: "07:00",
        paymentUrl: `https://example.test/booking/betaling/${token}`,
      });
      assert.match(confirm.text, /300 kr/);
      assert.match(confirm.text, /gælder først, når betalingen er gennemført/);
      assert.match(confirm.text, /Betal her/);
      assert.doesNotMatch(confirm.text, /ADMIN_PASSWORD|sk_live|DATABASE_URL/);

      const reject = buildRejectCustomerEmail({
        name: "Test",
        date: "2099-06-02",
        time: "07:00",
      });
      assert.match(reject.text, /ikke bekræfte/);
      assert.doesNotMatch(reject.text, /Betal her/);
      assert.doesNotMatch(reject.text, /300 kr/);
    });
  });
});

describe("admin confirm gates", () => {
  it("only confirms a session inquiry with a timeslot", () => {
    assert.equal(canConfirmSessionInquiry(inquiry).ok, true);
    assert.equal(
      canConfirmSessionInquiry({ ...inquiry, productId: "online" }).ok,
      false
    );
    assert.equal(
      canConfirmSessionInquiry({ ...inquiry, status: BOOKING_STATUS.awaitingPayment }).ok,
      false
    );
    assert.equal(canConfirmSessionInquiry({ ...inquiry, date: null }).ok, false);
    assert.equal(canRejectSessionBooking(inquiry).ok, true);
    assert.equal(
      canRejectSessionBooking({ ...inquiry, status: BOOKING_STATUS.confirmed }).ok,
      false
    );
    assert.equal(canResendPaymentLink(inquiry).ok, false);
    assert.equal(
      canResendPaymentLink({ ...inquiry, status: BOOKING_STATUS.awaitingPayment }).ok,
      true
    );
  });
});

describe("taken times", () => {
  it("blocks inquiry, confirmed and awaiting-payment slots", () => {
    const now = new Date("2099-01-01T10:00:00.000Z");
    assert.equal(blocksTimeslot(BOOKING_STATUS.inquiry, null, now), true);
    assert.equal(blocksTimeslot(BOOKING_STATUS.awaitingPayment, null, now), true);
    assert.equal(blocksTimeslot(BOOKING_STATUS.confirmed, null, now), true);
    assert.equal(blocksTimeslot(BOOKING_STATUS.rejected, null, now), false);
    assert.equal(blocksTimeslot(BOOKING_STATUS.cancelled, null, now), false);
    assert.equal(
      blocksTimeslot(BOOKING_STATUS.hold, new Date("2099-01-01T11:00:00.000Z"), now),
      true
    );
    assert.equal(
      blocksTimeslot(BOOKING_STATUS.hold, new Date("2099-01-01T09:00:00.000Z"), now),
      false
    );
  });
});

describe("payment link TTL", () => {
  it("accepts a valid link before expiry", () => {
    withSecret(() => {
      const now = new Date("2026-09-20T12:00:00.000Z");
      const bookingStart = new Date("2026-12-01T07:00:00.000Z");
      const expires = paymentLinkExpiresAt(now, bookingStart);
      assert.equal(PAYMENT_LINK_TTL_HOURS, 48);
      assert.equal(expires.getTime(), now.getTime() + 48 * 60 * 60 * 1000);

      const token = paymentToken(inquiry.id, now, { date: "2026-12-01", time: "07:00" });
      const verified = verifyBookingPaymentLinkToken(token, now);
      assert.equal(verified.ok, true);
      if (!verified.ok) return;
      assert.equal(verified.bookingId, inquiry.id);

      const bound = evaluateSessionCheckoutBinding({
        productId: "session",
        paymentToken: token,
        now,
      });
      assert.equal(bound.ok, true);
    });
  });

  it("rejects a link after expiry and does not start checkout", () => {
    withSecret(() => {
      const now = new Date("2026-09-20T12:00:00.000Z");
      const token = paymentToken(inquiry.id, now, { date: "2026-12-01", time: "07:00" });
      const afterExpiry = new Date(now.getTime() + 48 * 60 * 60 * 1000 + 1000);
      const verified = verifyBookingPaymentLinkToken(token, afterExpiry);
      assert.equal(verified.ok, false);
      if (verified.ok) return;
      assert.equal(verified.reason, "expired_token");

      const bound = evaluateSessionCheckoutBinding({
        productId: "session",
        paymentToken: token,
        now: afterExpiry,
      });
      assert.equal(bound.ok, false);
      if (bound.ok) return;
      assert.equal(bound.reason, "expired_token");
    });
  });

  it("caps expiry at booking start when that is sooner than 48 hours", () => {
    withSecret(() => {
      const times = { date: "2026-09-20", time: "16:00" };
      const bookingStart = sessionStartAt(times.date, times.time);
      const now = new Date(bookingStart.getTime() - 6 * 60 * 60 * 1000);
      const token = paymentToken(inquiry.id, now, times);
      const expires = paymentLinkExpiresAt(now, bookingStart);
      assert.equal(expires.getTime(), bookingStart.getTime());
      assert.equal(
        verifyBookingPaymentLinkToken(token, new Date(bookingStart.getTime() - 1000)).ok,
        true
      );
      const expired = verifyBookingPaymentLinkToken(token, bookingStart);
      assert.equal(expired.ok, false);
      if (expired.ok) return;
      assert.equal(expired.reason, "expired_token");
    });
  });

  it("rejects a tampered expiry or signature", () => {
    withSecret(() => {
      const now = new Date("2026-09-20T12:00:00.000Z");
      const token = paymentToken(inquiry.id, now, { date: "2026-12-01", time: "07:00" });
      const [bookingId, expiresAtUnix, mac] = token.split(".");
      const tamperedExpiry = `${bookingId}.${Number(expiresAtUnix) + 86400}.${mac}`;
      const tamperedMac = `${bookingId}.${expiresAtUnix}.deadbeef`;
      const replayExpired = verifyBookingPaymentLinkToken(
        token,
        new Date(now.getTime() + 49 * 60 * 60 * 1000)
      );

      const badExpiry = verifyBookingPaymentLinkToken(tamperedExpiry, now);
      assert.equal(badExpiry.ok, false);
      if (!badExpiry.ok) assert.equal(badExpiry.reason, "invalid_token");

      const badMac = verifyBookingPaymentLinkToken(tamperedMac, now);
      assert.equal(badMac.ok, false);
      if (!badMac.ok) assert.equal(badMac.reason, "invalid_token");

      assert.equal(replayExpired.ok, false);
      if (!replayExpired.ok) assert.equal(replayExpired.reason, "expired_token");
    });
  });

  it("rejects old tokens without expiry instead of leaving them valid", () => {
    withSecret(() => {
      const now = new Date("2026-09-20T12:00:00.000Z");
      const legacy = legacyV1Token(inquiry.id);
      const verified = verifyBookingPaymentLinkToken(legacy, now);
      assert.equal(verified.ok, false);
      if (verified.ok) return;
      assert.equal(verified.reason, "expired_token");
    });
  });

  it("lets admin resend a new signed link after the old one expired", () => {
    withSecret(() => {
      const firstNow = new Date("2026-09-20T12:00:00.000Z");
      const later = new Date("2026-09-23T12:00:00.000Z");
      const times = { date: "2026-12-01", time: "07:00" };
      const oldToken = paymentToken(inquiry.id, firstNow, times);
      const resent = paymentToken(inquiry.id, later, times);

      const oldAtLater = verifyBookingPaymentLinkToken(oldToken, later);
      assert.equal(oldAtLater.ok, false);
      if (!oldAtLater.ok) assert.equal(oldAtLater.reason, "expired_token");

      const fresh = verifyBookingPaymentLinkToken(resent, later);
      assert.equal(fresh.ok, true);
      if (!fresh.ok) return;
      assert.equal(fresh.bookingId, inquiry.id);
      assert.notEqual(resent, oldToken);
    });
  });

  it("does not let a paid, rejected or cancelled booking pay again", () => {
    withSecret(() => {
      const now = new Date("2026-09-20T12:00:00.000Z");
      const token = paymentToken(inquiry.id, now);
      assert.equal(verifyBookingPaymentLinkToken(token, now).ok, true);

      const paid = evaluateSessionPayment({
        ...inquiry,
        status: BOOKING_STATUS.confirmed,
      });
      assert.equal(paid.ok, false);
      if (!paid.ok) assert.equal(paid.reason, "already_paid");

      const rejected = evaluateSessionPayment({
        ...inquiry,
        status: BOOKING_STATUS.rejected,
      });
      assert.equal(rejected.ok, false);
      if (!rejected.ok) assert.equal(rejected.reason, "cancelled");

      const cancelled = evaluateSessionPayment({
        ...inquiry,
        status: BOOKING_STATUS.cancelled,
      });
      assert.equal(cancelled.ok, false);
      if (!cancelled.ok) assert.equal(cancelled.reason, "cancelled");
    });
  });
});

describe("failed payment customer email", () => {
  it("says payment did not go through and does not imply a charge", () => {
    const withRetry = buildFailedPaymentCustomerEmail({
      name: "Test",
      productName: "Personlig træning",
      date: "2099-06-02",
      time: "07:00",
      retryUrl: "https://example.test/booking/betaling/token",
      contactEmail: "lukasmoller2000@gmail.com",
    });
    assert.match(withRetry.subject, /ikke igennem/);
    assert.match(withRetry.text, /ikke igennem/);
    assert.match(withRetry.text, /ikke trukket penge/);
    assert.match(withRetry.text, /Personlig træning/);
    assert.match(withRetry.text, /2099|2\. juni|juni/i);
    assert.match(withRetry.text, /https:\/\/example\.test\/booking\/betaling\/token/);
    assert.doesNotMatch(withRetry.text, /Din betaling er bekræftet|Betalingsstatus: Betalt/);
    assert.doesNotMatch(withRetry.text, /ADMIN_PASSWORD|sk_live|DATABASE_URL|RESEND_API_KEY/);

    const expired = buildFailedPaymentCustomerEmail({
      name: "Test",
      productName: "Personlig træning",
      retryUrl: null,
      contactEmail: "lukasmoller2000@gmail.com",
    });
    assert.match(expired.text, /lukasmoller2000@gmail.com/);
    assert.match(expired.text, /nyt betalingslink/);
    assert.doesNotMatch(expired.text, /Betal her/);
  });

  it("reuses a payable session link and withholds one when the booking cannot pay", () => {
    withSecret(() => {
      const now = new Date("2026-09-20T12:00:00.000Z");
      const payable = resolveFailedPaymentRetryUrl(
        {
          productId: "session",
          status: "pending",
          bookings: [
            {
              id: inquiry.id,
              productId: "session",
              status: BOOKING_STATUS.awaitingPayment,
              date: "2026-12-01",
              time: "07:00",
            },
          ],
        },
        now
      );
      assert.ok(payable);
      assert.match(payable ?? "", /\/booking\/betaling\//);

      const paid = resolveFailedPaymentRetryUrl(
        {
          productId: "session",
          status: "paid",
          bookings: [
            {
              id: inquiry.id,
              productId: "session",
              status: BOOKING_STATUS.confirmed,
              date: "2026-12-01",
              time: "07:00",
            },
          ],
        },
        now
      );
      assert.equal(paid, null);
    });
  });
});
