import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOKING_STATUS,
  blocksTimeslot,
  bookingStatusAfterCheckoutExpired,
  bookingStatusAfterPaid,
  buildConfirmCustomerEmail,
  buildRejectCustomerEmail,
  canConfirmSessionInquiry,
  canRejectSessionBooking,
  canResendPaymentLink,
  createBookingPaymentLinkToken,
  evaluateSessionCheckoutBinding,
  evaluateSessionPayment,
  sessionCheckoutAmountOre,
  shouldSendDecisionEmail,
  verifyBookingPaymentLinkToken,
} from "./booking-payment";
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
      const token = createBookingPaymentLinkToken(inquiry.id);
      const verified = verifyBookingPaymentLinkToken(token);
      assert.equal(verified.ok, true);
      if (!verified.ok) return;
      assert.equal(verified.bookingId, inquiry.id);

      const bound = evaluateSessionCheckoutBinding({
        productId: "session",
        paymentToken: token,
        clientAmount: 1,
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
      const token = createBookingPaymentLinkToken(inquiry.id);
      const bound = evaluateSessionCheckoutBinding({
        productId: "session",
        paymentToken: token,
        clientAmount: 1,
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
      const token = createBookingPaymentLinkToken(inquiry.id);
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
