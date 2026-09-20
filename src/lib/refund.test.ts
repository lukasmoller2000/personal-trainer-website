import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMemoryStripeEventLedger,
  processVerifiedStripeEvent,
  STRIPE_EVENT_FAILED,
  STRIPE_EVENT_PROCESSED,
  type StripeWebhookEvent,
  type StripeWebhookOrder,
  type StripeWebhookSession,
} from "./stripe-webhook";
import {
  canShowAdminRefund,
  evaluateRefundEligibility,
  refundAmountOre,
  refundIdempotencyKey,
} from "./refund-policy";
import {
  refundPaidOrder,
  type RefundMailer,
  type RefundOrderRecord,
  type RefundPaymentIntent,
  type RefundStore,
  type StripeRefundApi,
  type StripeRefundRecord,
} from "./refund";
import { BOOKING_STATUS } from "./booking-payment";

function paidSessionOrder(overrides: Partial<RefundOrderRecord> = {}): RefundOrderRecord {
  return {
    id: "ord_pt",
    productId: "session",
    status: "paid",
    amountOre: 30000,
    chargedAmountOre: 30000,
    stripeCheckoutSessionId: "cs_pt",
    stripePaymentIntentId: "pi_pt",
    customerName: "Anna",
    customerEmail: "anna@example.com",
    date: "2099-06-02",
    time: "07:00",
    clipCard: null,
    bookings: [
      {
        id: "bk_pt",
        productId: "session",
        status: BOOKING_STATUS.confirmed,
      },
    ],
    ...overrides,
  };
}

function paidPackOrder(overrides: Partial<RefundOrderRecord> = {}): RefundOrderRecord {
  return {
    id: "ord_pack",
    productId: "pack-5",
    status: "paid",
    amountOre: 135000,
    chargedAmountOre: 135000,
    stripeCheckoutSessionId: "cs_pack",
    stripePaymentIntentId: "pi_pack",
    customerName: "Bo",
    customerEmail: "bo@example.com",
    date: null,
    time: null,
    clipCard: {
      id: "clip_1",
      status: "active",
      remaining: 5,
      totalSessions: 5,
    },
    bookings: [],
    ...overrides,
  };
}

function createMemoryRefundStore(seed: RefundOrderRecord[]) {
  const orders = new Map(seed.map((row) => [row.id, structuredClone(row)]));
  const store: RefundStore & { get(id: string): RefundOrderRecord | undefined } = {
    get(id) {
      return orders.get(id);
    },
    async findOrder(orderId) {
      const row = orders.get(orderId);
      return row ? structuredClone(row) : null;
    },
    async applyLocalRefund({ orderId, clipCardId, bookingIds }) {
      const row = orders.get(orderId);
      if (!row) return null;
      if (row.status === "refunded") return structuredClone(row);
      if (row.status !== "paid") return structuredClone(row);
      if (clipCardId && row.clipCard?.id === clipCardId) {
        row.clipCard = { ...row.clipCard, remaining: 0, status: "cancelled" };
      }
      row.bookings = row.bookings.map((booking) =>
        bookingIds.includes(booking.id)
          ? { ...booking, status: BOOKING_STATUS.cancelled }
          : booking
      );
      row.status = "refunded";
      orders.set(orderId, row);
      return structuredClone(row);
    },
  };
  return store;
}

function createMemoryStripe(input: {
  paymentIntents?: Record<string, RefundPaymentIntent>;
  sessions?: Record<string, { paymentIntentId: string; amountTotal: number }>;
  refunds?: Record<string, StripeRefundRecord[]>;
  failCreate?: boolean;
}) {
  const paymentIntents = { ...(input.paymentIntents ?? {}) };
  const sessions = { ...(input.sessions ?? {}) };
  const refunds = new Map<string, StripeRefundRecord[]>(
    Object.entries(input.refunds ?? {}).map(([id, rows]) => [id, [...rows]])
  );
  const creates: Array<{
    paymentIntentId: string;
    amount: number;
    idempotencyKey: string;
  }> = [];
  let createCount = 0;

  const stripe: StripeRefundApi & { creates: typeof creates; createCount: () => number } = {
    creates,
    createCount: () => createCount,
    async retrievePaymentIntent(id) {
      return paymentIntents[id] ?? null;
    },
    async retrieveCheckoutSession(id) {
      const session = sessions[id];
      if (!session) return null;
      return {
        id,
        paymentIntentId: session.paymentIntentId,
        amountTotal: session.amountTotal,
        paymentStatus: "paid",
      };
    },
    async listRefunds(paymentIntentId) {
      return [...(refunds.get(paymentIntentId) ?? [])];
    },
    async createRefund({ paymentIntentId, amount, idempotencyKey }) {
      creates.push({ paymentIntentId, amount, idempotencyKey });
      const existing = (refunds.get(paymentIntentId) ?? []).find(
        (row) => row.id === `re_${idempotencyKey}`
      );
      if (existing) return existing;
      if (input.failCreate) {
        throw new Error("stripe_unavailable");
      }
      createCount += 1;
      const created: StripeRefundRecord = {
        id: `re_${idempotencyKey}`,
        status: "succeeded",
        amount,
        paymentIntentId,
      };
      refunds.set(paymentIntentId, [...(refunds.get(paymentIntentId) ?? []), created]);
      return created;
    },
  };
  return stripe;
}

function createMailSpy() {
  const sent: Array<{ to: string; subject: string; text: string }> = [];
  const claimed = new Set<string>();
  const mail: RefundMailer = {
    async sendCustomer(input) {
      sent.push(input);
    },
  };
  return {
    mail,
    sent,
    ledger: {
      async alreadySent(id: string) {
        return claimed.has(id);
      },
      async claim(id: string) {
        if (claimed.has(id)) return "duplicate" as const;
        claimed.add(id);
        return "new" as const;
      },
    },
  };
}

describe("admin refund eligibility", () => {
  it("shows the refund button only for paid, verifiable Stripe payments", () => {
    const paid = paidSessionOrder();
    assert.equal(canShowAdminRefund(paid, null), true);
    assert.equal(canShowAdminRefund(paidSessionOrder({ status: "pending" }), null), false);
    assert.equal(canShowAdminRefund(paidSessionOrder({ status: "cancelled" }), null), false);
    assert.equal(canShowAdminRefund(paidSessionOrder({ status: "failed" }), null), false);
    assert.equal(canShowAdminRefund(paidSessionOrder({ status: "refunded" }), null), false);
    assert.equal(
      canShowAdminRefund(
        paidSessionOrder({
          stripePaymentIntentId: null,
          stripeCheckoutSessionId: null,
        }),
        null
      ),
      false
    );
  });

  it("hides 5-clip refund when clips have been used", () => {
    const unused = paidPackOrder();
    assert.equal(canShowAdminRefund(unused, unused.clipCard), true);
    const used = { id: "clip_used", status: "active", remaining: 4, totalSessions: 5 };
    assert.equal(canShowAdminRefund(paidPackOrder({ clipCard: used }), used), false);
    const blocked = evaluateRefundEligibility(paidPackOrder({ clipCard: used }), used);
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.match(blocked.error, /manuel gennemgang/);
  });

  it("uses stored charged amount, not a client amount", () => {
    assert.equal(refundAmountOre({ amountOre: 30000, chargedAmountOre: 25000 }), 25000);
    assert.equal(refundAmountOre({ amountOre: 135000, chargedAmountOre: null }), 135000);
  });
});

describe("admin Stripe refund", () => {
  it("refunds a paid PT order in Stripe and cancels the linked booking", async () => {
    const order = paidSessionOrder();
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_pt: { id: "pi_pt", status: "succeeded", amount: 30000, currency: "dkk" },
      },
    });
    const mail = createMailSpy();

    const result = await refundPaidOrder({
      orderId: order.id,
      clientAmount: 1,
      clientPaymentIntent: "pi_fake_from_client",
      clientStripeAccount: "acct_fake",
      stripe,
      store,
      mail: mail.mail,
      mailLedger: mail.ledger,
    });

    assert.equal(result.status, "refunded");
    assert.equal(result.alreadyRefunded, false);
    assert.equal(result.amountOre, 30000);
    assert.equal(result.mailSent, true);
    assert.equal(store.get(order.id)?.status, "refunded");
    assert.equal(store.get(order.id)?.bookings[0]?.status, BOOKING_STATUS.cancelled);
    assert.equal(stripe.createCount(), 1);
    assert.equal(stripe.creates[0]?.paymentIntentId, "pi_pt");
    assert.equal(stripe.creates[0]?.amount, 30000);
    assert.equal(stripe.creates[0]?.idempotencyKey, refundIdempotencyKey(order.id));
    assert.equal(mail.sent.length, 1);
    assert.match(mail.sent[0]?.subject ?? "", /Refundering/);
    assert.match(mail.sent[0]?.text ?? "", /Refunderet/);
  });

  it("refunds an unused paid 5-clip pack and deactivates the card without recreating clips", async () => {
    const order = paidPackOrder();
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_pack: { id: "pi_pack", status: "succeeded", amount: 135000, currency: "dkk" },
      },
    });

    const result = await refundPaidOrder({
      orderId: order.id,
      stripe,
      store,
    });

    const updated = store.get(order.id);
    assert.equal(result.status, "refunded");
    assert.equal(updated?.status, "refunded");
    assert.equal(updated?.clipCard?.status, "cancelled");
    assert.equal(updated?.clipCard?.remaining, 0);
    assert.equal(updated?.clipCard?.totalSessions, 5);
    assert.equal(stripe.createCount(), 1);
  });

  it("rejects pending, cancelled and failed orders and does not call Stripe", async () => {
    for (const status of ["pending", "cancelled", "failed"] as const) {
      const order = paidSessionOrder({ id: `ord_${status}`, status });
      const store = createMemoryRefundStore([order]);
      const stripe = createMemoryStripe({
        paymentIntents: {
          pi_pt: { id: "pi_pt", status: "succeeded", amount: 30000, currency: "dkk" },
        },
      });
      await assert.rejects(
        () => refundPaidOrder({ orderId: order.id, stripe, store }),
        /Kun betalte ordrer/
      );
      assert.equal(store.get(order.id)?.status, status);
      assert.equal(stripe.createCount(), 0);
    }
  });

  it("keeps the order paid when Stripe refund creation fails", async () => {
    const order = paidSessionOrder();
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_pt: { id: "pi_pt", status: "succeeded", amount: 30000, currency: "dkk" },
      },
      failCreate: true,
    });

    await assert.rejects(
      () => refundPaidOrder({ orderId: order.id, stripe, store }),
      /kunne ikke refundere/
    );
    assert.equal(store.get(order.id)?.status, "paid");
    assert.equal(store.get(order.id)?.bookings[0]?.status, BOOKING_STATUS.confirmed);
  });

  it("does not create a second Stripe refund on replay", async () => {
    const order = paidSessionOrder();
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_pt: { id: "pi_pt", status: "succeeded", amount: 30000, currency: "dkk" },
      },
    });
    const mail = createMailSpy();

    const first = await refundPaidOrder({
      orderId: order.id,
      stripe,
      store,
      mail: mail.mail,
      mailLedger: mail.ledger,
    });
    const replay = await refundPaidOrder({
      orderId: order.id,
      stripe,
      store,
      mail: mail.mail,
      mailLedger: mail.ledger,
    });

    assert.equal(first.status, "refunded");
    assert.equal(replay.status, "refunded");
    assert.equal(replay.alreadyRefunded, true);
    assert.equal(stripe.createCount(), 1);
    assert.equal(first.refundId, replay.refundId);
    assert.equal(mail.sent.length, 1);
  });

  it("ignores a fake client amount and PaymentIntent", async () => {
    const order = paidSessionOrder({ chargedAmountOre: 25000, amountOre: 25000 });
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_pt: { id: "pi_pt", status: "succeeded", amount: 25000, currency: "dkk" },
        pi_fake_from_client: {
          id: "pi_fake_from_client",
          status: "succeeded",
          amount: 1,
          currency: "dkk",
        },
      },
    });

    await refundPaidOrder({
      orderId: order.id,
      clientAmount: 1,
      clientPaymentIntent: "pi_fake_from_client",
      stripe,
      store,
    });

    assert.deepEqual(stripe.creates, [
      {
        paymentIntentId: "pi_pt",
        amount: 25000,
        idempotencyKey: refundIdempotencyKey(order.id),
      },
    ]);
  });

  it("rejects a used 5-clip pack before any Stripe write", async () => {
    const order = paidPackOrder({
      clipCard: { id: "clip_used", status: "active", remaining: 3, totalSessions: 5 },
    });
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_pack: { id: "pi_pack", status: "succeeded", amount: 135000, currency: "dkk" },
      },
    });

    await assert.rejects(
      () => refundPaidOrder({ orderId: order.id, stripe, store }),
      /manuel gennemgang/
    );
    assert.equal(store.get(order.id)?.status, "paid");
    assert.equal(store.get(order.id)?.clipCard?.remaining, 3);
    assert.equal(stripe.createCount(), 0);
  });

  it("reuses an existing Stripe refund if the payment is already refunded there", async () => {
    const order = paidSessionOrder();
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_pt: { id: "pi_pt", status: "succeeded", amount: 30000, currency: "dkk" },
      },
      refunds: {
        pi_pt: [
          {
            id: "re_existing",
            status: "succeeded",
            amount: 30000,
            paymentIntentId: "pi_pt",
          },
        ],
      },
    });

    const result = await refundPaidOrder({ orderId: order.id, stripe, store });
    assert.equal(result.refundId, "re_existing");
    assert.equal(result.alreadyRefunded, true);
    assert.equal(stripe.createCount(), 0);
    assert.equal(store.get(order.id)?.status, "refunded");
  });

  it("sends the refund email once even if mail is attempted again after success", async () => {
    const order = paidSessionOrder();
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_pt: { id: "pi_pt", status: "succeeded", amount: 30000, currency: "dkk" },
      },
    });
    const mail = createMailSpy();

    await refundPaidOrder({
      orderId: order.id,
      stripe,
      store,
      mail: mail.mail,
      mailLedger: mail.ledger,
    });
    await refundPaidOrder({
      orderId: order.id,
      stripe,
      store,
      mail: mail.mail,
      mailLedger: mail.ledger,
    });

    assert.equal(mail.sent.length, 1);
    assert.match(mail.sent[0]?.text ?? "", /Din betaling er refunderet/);
  });

  it("does not roll back a successful refund when mail fails", async () => {
    const order = paidSessionOrder();
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_pt: { id: "pi_pt", status: "succeeded", amount: 30000, currency: "dkk" },
      },
    });

    const result = await refundPaidOrder({
      orderId: order.id,
      stripe,
      store,
      mail: {
        async sendCustomer() {
          throw new Error("mail down");
        },
      },
    });

    assert.equal(result.status, "refunded");
    assert.equal(result.mailSent, false);
    assert.equal(store.get(order.id)?.status, "refunded");
    assert.equal(stripe.createCount(), 1);
  });

  it("resolves the PaymentIntent from the stored Checkout Session when the PI id is missing", async () => {
    const order = paidSessionOrder({ stripePaymentIntentId: null });
    const store = createMemoryRefundStore([order]);
    const stripe = createMemoryStripe({
      paymentIntents: {
        pi_from_session: {
          id: "pi_from_session",
          status: "succeeded",
          amount: 30000,
          currency: "dkk",
        },
      },
      sessions: {
        cs_pt: { paymentIntentId: "pi_from_session", amountTotal: 30000 },
      },
    });

    const result = await refundPaidOrder({ orderId: order.id, stripe, store });
    assert.equal(result.status, "refunded");
    assert.equal(stripe.creates[0]?.paymentIntentId, "pi_from_session");
  });
});

function sessionEvent(
  overrides: {
    id?: string;
    type?: string;
    session?: Partial<StripeWebhookSession>;
  } = {}
): StripeWebhookEvent {
  return {
    id: overrides.id ?? "evt_1",
    type: overrides.type ?? "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        payment_status: "paid",
        amount_total: 30000,
        currency: "dkk",
        payment_intent: "pi_1",
        metadata: { orderId: "ord_1" },
        ...overrides.session,
      },
    },
  };
}

function standardOrder(overrides: Partial<StripeWebhookOrder> = {}): StripeWebhookOrder {
  return {
    id: "ord_1",
    productId: "session",
    priceTier: "standard",
    vfgMemberVerified: false,
    chargedAmountOre: 30000,
    ...overrides,
  };
}

async function runWebhook(input: {
  event: StripeWebhookEvent;
  order?: StripeWebhookOrder | null;
  ledger?: ReturnType<typeof createMemoryStripeEventLedger>;
  fulfill?: Parameters<typeof processVerifiedStripeEvent>[0]["fulfillPaidOrder"];
  notifyFailedPayment?: Parameters<typeof processVerifiedStripeEvent>[0]["notifyFailedPayment"];
}) {
  const ledger = input.ledger ?? createMemoryStripeEventLedger();
  const fulfillments: string[] = [];
  const failedPayments: string[] = [];
  const result = await processVerifiedStripeEvent({
    event: input.event,
    retrieveSession: async () => input.event.data.object,
    findOrder: async () => input.order ?? null,
    fulfillPaidOrder:
      input.fulfill ??
      (async ({ orderId }) => {
        fulfillments.push(orderId);
        return { ok: true as const };
      }),
    failPendingOrder: async () => undefined,
    notifyFailedPayment:
      input.notifyFailedPayment ??
      (async (order) => {
        failedPayments.push(order.id);
      }),
    ledger,
  });
  return { result, fulfillments, failedPayments, ledger };
}

describe("webhook behavior stays unchanged beside refunds", () => {
  it("validates before claim; 409 mismatch; 500 retry; 200 success; 200 replay", async () => {
    const event = sessionEvent();
    const order = standardOrder();
    const ledger = createMemoryStripeEventLedger();

    const mismatch = await runWebhook({
      event: sessionEvent({ session: { amount_total: 1 } }),
      order,
    });
    assert.equal(mismatch.result.status, 409);
    assert.equal(mismatch.result.body.rejected, "amount_mismatch");
    assert.equal(mismatch.fulfillments.length, 0);

    const failed = await runWebhook({
      event,
      order,
      ledger,
      fulfill: async () => {
        throw new Error("database down");
      },
    });
    assert.equal(failed.result.status, 500);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_FAILED);

    const success = await runWebhook({ event, order, ledger });
    assert.equal(success.result.status, 200);
    assert.equal(success.fulfillments.length, 1);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);

    const replay = await runWebhook({ event, order, ledger });
    assert.equal(replay.result.status, 200);
    assert.equal(replay.result.body.duplicate, true);
    assert.equal(replay.fulfillments.length, 0);
  });

  it("still accepts standard and member amounts", async () => {
    const standard = await runWebhook({
      event: sessionEvent({ id: "evt_std" }),
      order: standardOrder(),
    });
    assert.equal(standard.result.status, 200);

    const member = await runWebhook({
      event: sessionEvent({
        id: "evt_mem",
        session: { amount_total: 25000, metadata: { orderId: "ord_mem" } },
      }),
      order: {
        id: "ord_mem",
        productId: "session",
        priceTier: "vfg_member",
        vfgMemberVerified: true,
        chargedAmountOre: 25000,
      },
    });
    assert.equal(member.result.status, 200);
  });

  it("still sends failed-payment mail without fulfilling", async () => {
    const event = sessionEvent({
      id: "evt_fail",
      type: "payment_intent.payment_failed",
      session: {
        id: "pi_fail",
        payment_status: "unpaid",
        payment_intent: "pi_fail",
        metadata: { orderId: "ord_1" },
      },
    });
    const first = await runWebhook({
      event,
      order: {
        ...standardOrder(),
        customerEmail: "test@example.com",
        customerName: "Test",
      },
    });
    assert.equal(first.result.status, 200);
    assert.deepEqual(first.failedPayments, ["ord_1"]);
    assert.equal(first.fulfillments.length, 0);

    const replay = await runWebhook({
      event,
      order: standardOrder({ customerEmail: "test@example.com" }),
      ledger: first.ledger,
    });
    assert.equal(replay.result.status, 200);
    assert.equal(replay.result.body.duplicate, true);
    assert.equal(replay.failedPayments.length, 0);
  });
});
