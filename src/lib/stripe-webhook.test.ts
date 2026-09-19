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

function catalogOrder(overrides: Partial<StripeWebhookOrder> = {}): StripeWebhookOrder {
  return {
    id: "ord_1",
    productId: "session",
    ...overrides,
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
}) {
  const ledger = input.ledger ?? createMemoryStripeEventLedger();
  const fulfillments: string[] = [];
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
    ledger,
  });
  return { result, fulfillments, ledger };
}

describe("Stripe webhook idempotency", () => {
  it("fulfills a 30000 øre session exactly once and ignores replay", async () => {
    const event = sessionEvent();
    const order = catalogOrder();
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

  it("fulfills a 135000 øre 5-pack exactly as before", async () => {
    const event = sessionEvent({
      id: "evt_pack",
      session: {
        amount_total: 135000,
        metadata: { orderId: "ord_pack" },
      },
    });
    const { result, fulfillments, ledger } = await runWebhook({
      event,
      order: catalogOrder({ id: "ord_pack", productId: "pack-5" }),
    });
    assert.equal(result.status, 200);
    assert.deepEqual(fulfillments, ["ord_pack"]);
    assert.equal(await ledger.getStatus("evt_pack"), STRIPE_EVENT_PROCESSED);
  });

  it("does not lock a wrong amount as processed", async () => {
    const event = sessionEvent({ session: { amount_total: 1 } });
    const { result, fulfillments, ledger } = await runWebhook({
      event,
      order: catalogOrder(),
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
      order: catalogOrder(),
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
      order: catalogOrder({ productId: "pack-10" }),
    });
    assert.equal(result.status, 409);
    assert.equal(result.body.rejected, "unknown_product");
    assert.equal(fulfillments.length, 0);
    assert.notEqual(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);
  });

  it("rejects member amounts against the standard catalog", async () => {
    const session250 = await runWebhook({
      event: sessionEvent({ session: { amount_total: 25000 } }),
      order: catalogOrder(),
    });
    assert.equal(session250.result.status, 409);
    assert.equal(session250.result.body.rejected, "amount_mismatch");
    assert.equal(session250.fulfillments.length, 0);

    const pack1150 = await runWebhook({
      event: sessionEvent({
        session: { amount_total: 115000, metadata: { orderId: "ord_pack" } },
      }),
      order: catalogOrder({ id: "ord_pack", productId: "pack-5" }),
    });
    assert.equal(pack1150.result.status, 409);
    assert.equal(pack1150.result.body.rejected, "amount_mismatch");
    assert.equal(pack1150.fulfillments.length, 0);
  });

  it("leaves a DB/fulfillment failure unprocessed so Stripe can retry", async () => {
    const event = sessionEvent();
    const order = catalogOrder();
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
    const ledger = createMemoryStripeEventLedger();
    const order = catalogOrder();
    const wrong = sessionEvent({ session: { amount_total: 1 } });

    const first = await runWebhook({ event: wrong, order, ledger });
    assert.equal(first.result.status, 409);
    assert.equal(first.result.body.rejected, "amount_mismatch");
    assert.equal(first.fulfillments.length, 0);
    assert.notEqual(await ledger.getStatus(wrong.id), STRIPE_EVENT_PROCESSED);

    const fixed = await runWebhook({ event: sessionEvent(), order, ledger });
    assert.equal(fixed.result.status, 200);
    assert.equal(fixed.fulfillments.length, 1);
    assert.equal(await ledger.getStatus(wrong.id), STRIPE_EVENT_PROCESSED);
  });

  it("ignores unused event types without marking them processed", async () => {
    const event = sessionEvent({ type: "payment_intent.succeeded" });
    const { result, fulfillments, ledger } = await runWebhook({
      event,
      order: catalogOrder(),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.ignored, true);
    assert.equal(fulfillments.length, 0);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_NONE);
  });
});
