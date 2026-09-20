import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createMemoryStripeEventLedger,
  processVerifiedStripeEvent,
  STRIPE_EVENT_FAILED,
  STRIPE_EVENT_NONE,
  STRIPE_EVENT_PROCESSED,
  type ProcessVerifiedStripeEventInput,
  type StripeWebhookEvent,
  type StripeWebhookOrder,
  type StripeWebhookSession,
} from "./stripe-webhook";

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

function memberSessionOrder(): StripeWebhookOrder {
  return {
    id: "ord_member_session",
    productId: "session",
    priceTier: "vfg_member",
    vfgMemberVerified: true,
    chargedAmountOre: 25000,
  };
}

function memberPackOrder(): StripeWebhookOrder {
  return {
    id: "ord_member_pack",
    productId: "pack-5",
    priceTier: "vfg_member",
    vfgMemberVerified: true,
    chargedAmountOre: 115000,
  };
}

async function runWebhook(input: {
  event: StripeWebhookEvent;
  order?: StripeWebhookOrder | null;
  ledger?: ReturnType<typeof createMemoryStripeEventLedger>;
  fulfill?: ProcessVerifiedStripeEventInput["fulfillPaidOrder"];
  failPending?: ProcessVerifiedStripeEventInput["failPendingOrder"];
  retrieveSession?: ProcessVerifiedStripeEventInput["retrieveSession"];
  findOrder?: ProcessVerifiedStripeEventInput["findOrder"];
  notifyFailedPayment?: ProcessVerifiedStripeEventInput["notifyFailedPayment"];
}) {
  const ledger = input.ledger ?? createMemoryStripeEventLedger();
  const fulfillments: string[] = [];
  const failedPayments: string[] = [];
  const result = await processVerifiedStripeEvent({
    event: input.event,
    retrieveSession:
      input.retrieveSession ?? (async () => input.event.data.object),
    findOrder: input.findOrder ?? (async () => input.order ?? null),
    fulfillPaidOrder:
      input.fulfill ??
      (async ({ orderId }) => {
        fulfillments.push(orderId);
        return { ok: true as const };
      }),
    failPendingOrder: input.failPending ?? (async () => undefined),
    notifyFailedPayment:
      input.notifyFailedPayment ??
      (async (order) => {
        failedPayments.push(order.id);
      }),
    ledger,
  });
  return { result, fulfillments, failedPayments, ledger };
}

describe("Stripe webhook idempotency", () => {
  it("fulfills a correct payment exactly once and ignores replay", async () => {
    const event = sessionEvent();
    const order = standardOrder();
    const ledger = createMemoryStripeEventLedger();

    const first = await runWebhook({ event, order, ledger });
    assert.equal(first.result.status, 200);
    assert.equal(first.result.body.received, true);
    assert.equal(first.fulfillments.length, 1);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);

    const replay = await runWebhook({ event, order, ledger });
    assert.equal(replay.result.status, 200);
    assert.equal(replay.result.body.duplicate, true);
    assert.equal(replay.fulfillments.length, 0);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);
  });

  it("does not lock a wrong amount as processed", async () => {
    const event = sessionEvent({ session: { amount_total: 1 } });
    const { result, fulfillments, ledger } = await runWebhook({
      event,
      order: standardOrder(),
    });
    assert.equal(result.status, 409);
    assert.equal(result.body.rejected, "amount_mismatch");
    assert.equal(result.body.received, false);
    assert.equal(fulfillments.length, 0);
    assert.notEqual(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_FAILED);
  });

  it("does not lock a wrong currency as processed", async () => {
    const event = sessionEvent({ session: { currency: "usd" } });
    const { result, fulfillments, ledger } = await runWebhook({
      event,
      order: standardOrder(),
    });
    assert.equal(result.status, 409);
    assert.equal(result.body.rejected, "currency_mismatch");
    assert.equal(fulfillments.length, 0);
    assert.notEqual(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);
  });

  it("does not lock an unknown product as processed", async () => {
    const event = sessionEvent();
    const { result, fulfillments, ledger } = await runWebhook({
      event,
      order: standardOrder({ productId: "pack-10" }),
    });
    assert.equal(result.status, 409);
    assert.equal(result.body.rejected, "unknown_product");
    assert.equal(fulfillments.length, 0);
    assert.notEqual(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);
  });

  it("leaves a DB/fulfillment failure unprocessed so Stripe can retry", async () => {
    const event = sessionEvent();
    const order = standardOrder();
    const ledger = createMemoryStripeEventLedger();

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
    assert.notEqual(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);

    const retry = await runWebhook({ event, order, ledger });
    assert.equal(retry.result.status, 200);
    assert.equal(retry.fulfillments.length, 1);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);
  });

  it("can succeed later after a catalog/amount mismatch is fixed", async () => {
    const event = sessionEvent();
    const ledger = createMemoryStripeEventLedger();
    const broken = standardOrder({ chargedAmountOre: 99999 });

    const first = await runWebhook({ event, order: broken, ledger });
    assert.equal(first.result.status, 409);
    assert.equal(first.result.body.rejected, "amount_mismatch");
    assert.equal(first.fulfillments.length, 0);
    assert.notEqual(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);

    const fixed = await runWebhook({ event, order: standardOrder(), ledger });
    assert.equal(fixed.result.status, 200);
    assert.equal(fixed.fulfillments.length, 1);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);
  });

  it("accepts verified member amounts 25000 and 115000", async () => {
    const sessionEvent250 = sessionEvent({
      id: "evt_member_session",
      session: {
        amount_total: 25000,
        metadata: { orderId: "ord_member_session" },
      },
    });
    const session = await runWebhook({
      event: sessionEvent250,
      order: memberSessionOrder(),
    });
    assert.equal(session.result.status, 200);
    assert.deepEqual(session.fulfillments, ["ord_member_session"]);
    assert.equal(await session.ledger.getStatus("evt_member_session"), STRIPE_EVENT_PROCESSED);

    const packEvent = sessionEvent({
      id: "evt_member_pack",
      session: {
        amount_total: 115000,
        metadata: { orderId: "ord_member_pack" },
      },
    });
    const pack = await runWebhook({
      event: packEvent,
      order: memberPackOrder(),
    });
    assert.equal(pack.result.status, 200);
    assert.deepEqual(pack.fulfillments, ["ord_member_pack"]);
    assert.equal(await pack.ledger.getStatus("evt_member_pack"), STRIPE_EVENT_PROCESSED);
  });

  it("ignores unused event types without marking them processed", async () => {
    const event = sessionEvent({ type: "payment_intent.succeeded" });
    const { result, fulfillments, ledger } = await runWebhook({
      event,
      order: standardOrder(),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.ignored, true);
    assert.equal(fulfillments.length, 0);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_NONE);
  });
});

function failedPaymentEvent(
  overrides: {
    id?: string;
    session?: Partial<StripeWebhookSession>;
  } = {}
): StripeWebhookEvent {
  return sessionEvent({
    id: overrides.id ?? "evt_pi_fail_1",
    type: "payment_intent.payment_failed",
    session: {
      id: "pi_fail_1",
      payment_status: "unpaid",
      payment_intent: "pi_fail_1",
      metadata: { orderId: "ord_1" },
      ...overrides.session,
    },
  });
}

function failedPaymentOrder(overrides: Partial<StripeWebhookOrder> = {}): StripeWebhookOrder {
  return {
    ...standardOrder(),
    customerEmail: "test@example.com",
    customerName: "Test",
    date: "2099-06-02",
    time: "07:00",
    status: "pending",
    ...overrides,
  };
}

describe("failed payment customer mail", () => {
  it("sends one mail on the first failed event and does not fulfill", async () => {
    const event = failedPaymentEvent();
    const order = failedPaymentOrder();
    const ledger = createMemoryStripeEventLedger();
    const first = await runWebhook({ event, order, ledger });
    assert.equal(first.result.status, 200);
    assert.equal(first.result.body.received, true);
    assert.deepEqual(first.failedPayments, ["ord_1"]);
    assert.equal(first.fulfillments.length, 0);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);
  });

  it("does not send a second mail on replay of the same event", async () => {
    const event = failedPaymentEvent();
    const order = failedPaymentOrder();
    const ledger = createMemoryStripeEventLedger();
    await runWebhook({ event, order, ledger });
    const replay = await runWebhook({ event, order, ledger });
    assert.equal(replay.result.status, 200);
    assert.equal(replay.result.body.duplicate, true);
    assert.equal(replay.failedPayments.length, 0);
    assert.equal(replay.fulfillments.length, 0);
  });

  it("can send a new mail for a later genuine failure", async () => {
    const order = failedPaymentOrder();
    const ledger = createMemoryStripeEventLedger();
    const first = await runWebhook({
      event: failedPaymentEvent({ id: "evt_pi_fail_1" }),
      order,
      ledger,
    });
    const second = await runWebhook({
      event: failedPaymentEvent({
        id: "evt_pi_fail_2",
        session: { id: "pi_fail_2", payment_intent: "pi_fail_2" },
      }),
      order,
      ledger,
    });
    assert.equal(first.result.status, 200);
    assert.equal(second.result.status, 200);
    assert.deepEqual(first.failedPayments, ["ord_1"]);
    assert.deepEqual(second.failedPayments, ["ord_1"]);
    assert.equal(first.fulfillments.length, 0);
    assert.equal(second.fulfillments.length, 0);
  });

  it("handles a mail-provider error safely without fulfilling", async () => {
    const event = failedPaymentEvent({ id: "evt_pi_mail_err" });
    const { result, fulfillments, ledger } = await runWebhook({
      event,
      order: failedPaymentOrder(),
      notifyFailedPayment: async () => {
        throw new Error("mail provider unavailable");
      },
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.received, true);
    assert.equal(fulfillments.length, 0);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);
  });

  it("does not fulfill a failed payment even when mail is sent", async () => {
    const event = failedPaymentEvent({ id: "evt_pi_no_fulfill" });
    const { result, fulfillments, failedPayments } = await runWebhook({
      event,
      order: failedPaymentOrder(),
    });
    assert.equal(result.status, 200);
    assert.deepEqual(failedPayments, ["ord_1"]);
    assert.equal(fulfillments.length, 0);
  });

  it("skips mail when the customer email is missing", async () => {
    const event = failedPaymentEvent({ id: "evt_pi_no_email" });
    const { result, failedPayments, fulfillments } = await runWebhook({
      event,
      order: failedPaymentOrder({ customerEmail: "" }),
    });
    assert.equal(result.status, 200);
    assert.equal(failedPayments.length, 0);
    assert.equal(fulfillments.length, 0);
  });
});
