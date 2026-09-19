import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  claimPendingPackOrder,
  createMemoryCheckoutSessions,
  createMemoryPackOrderStore,
  ensureOpenCheckoutSession,
  evaluateExistingCheckoutSession,
  normalizeCheckoutEmail,
  packCheckoutIdempotencyKey,
  resolvePendingOrderRace,
  shouldApplyTerminalSessionToOrder,
  stripeCheckoutIdempotencyKey,
} from "./checkout-idempotency";
import { resolveCheckoutPrice } from "./checkout-price";
import {
  createMemoryStripeEventLedger,
  processVerifiedStripeEvent,
  STRIPE_EVENT_FAILED,
  STRIPE_EVENT_PROCESSED,
  type StripeWebhookEvent,
  type StripeWebhookOrder,
  type StripeWebhookSession,
} from "./stripe-webhook";
import { isActiveVfgMember, type VfgMembershipLookupResult } from "./vfg-membership";

const customer = {
  name: "Test",
  email: "  Member@Example.com ",
  phone: "25890453",
  goal: "Styrke",
};

function memberLookup(): VfgMembershipLookupResult {
  return {
    verified: true,
    active: true,
    status: "active",
    memberId: "vfg_1",
    verifiedAt: new Date("2026-09-20T00:00:00.000Z"),
  };
}

function standardLookup(): VfgMembershipLookupResult {
  return {
    verified: false,
    active: false,
    status: "unverified",
    memberId: null,
    verifiedAt: new Date("2026-09-20T00:00:00.000Z"),
  };
}

function serverPrice(productId: string, membership: VfgMembershipLookupResult) {
  return resolveCheckoutPrice({
    productId,
    isVfgMember: isActiveVfgMember(membership),
  });
}

async function packCheckoutAttempt(input: {
  store: ReturnType<typeof createMemoryPackOrderStore>;
  sessions: ReturnType<typeof createMemoryCheckoutSessions>;
  membership: VfgMembershipLookupResult;
  clientAmount?: number;
  clientIsMember?: unknown;
  clientPriceTier?: unknown;
  clientRequestId?: unknown;
}) {
  void input.clientAmount;
  void input.clientIsMember;
  void input.clientPriceTier;
  void input.clientRequestId;
  const priced = serverPrice("pack-5", input.membership);
  assert.ok(priced);
  const claimed = await claimPendingPackOrder({
    store: input.store,
    productId: "pack-5",
    customer,
    amountOre: priced.amountOre,
    priceTier: priced.priceTier,
    vfgMemberVerified: priced.priceTier === "vfg_member",
  });
  const session = await ensureOpenCheckoutSession({
    orderId: claimed.order.id,
    existingSessionId: claimed.order.stripeCheckoutSessionId,
    expectedAmountOre: priced.amountOre,
    sessions: {
      retrieve: (id) => input.sessions.retrieve(id),
      create: (key) =>
        input.sessions.create(key, { amount_total: priced.amountOre }),
    },
    attachSession: async (orderId, sessionId) => {
      input.store.attach(orderId, sessionId);
      claimed.order.stripeCheckoutSessionId = sessionId;
    },
  });
  return { claimed, session, priced };
}

describe("5-clip checkout idempotency", () => {
  it("derives a server key from email + product and ignores client handles", () => {
    assert.equal(
      packCheckoutIdempotencyKey("  Member@Example.com ", "pack-5"),
      "member@example.com|pack-5"
    );
    assert.equal(normalizeCheckoutEmail("  Member@Example.com "), "member@example.com");
    assert.equal(stripeCheckoutIdempotencyKey("ord_1", "new"), "checkout:ord_1:new");
  });

  it("first request creates 1 pending Order; replay keeps that Order", async () => {
    const store = createMemoryPackOrderStore();
    const sessions = createMemoryCheckoutSessions();
    const membership = memberLookup();

    const first = await packCheckoutAttempt({ store, sessions, membership });
    assert.equal(first.session.ok, true);
    if (!first.session.ok) return;
    assert.equal(first.claimed.created, true);
    assert.equal(store.pendingCount(customer.email, "pack-5"), 1);
    assert.equal(first.priced.amountOre, 115000);
    assert.equal(first.priced.priceTier, "vfg_member");

    const replay = await packCheckoutAttempt({ store, sessions, membership });
    assert.equal(replay.session.ok, true);
    if (!replay.session.ok) return;
    assert.equal(replay.claimed.created, false);
    assert.equal(replay.claimed.order.id, first.claimed.order.id);
    assert.equal(replay.session.sessionId, first.session.sessionId);
    assert.equal(replay.session.reused, true);
    assert.equal(store.pendingCount(customer.email, "pack-5"), 1);
    assert.equal(sessions.createCount, 1);
  });

  it("replay with a fake amount still charges the server amount", async () => {
    const store = createMemoryPackOrderStore();
    const sessions = createMemoryCheckoutSessions();
    const membership = memberLookup();

    const first = await packCheckoutAttempt({ store, sessions, membership });
    const replay = await packCheckoutAttempt({
      store,
      sessions,
      membership,
      clientAmount: 1,
    });

    assert.equal(first.priced.amountOre, 115000);
    assert.equal(replay.priced.amountOre, 115000);
    assert.equal(replay.claimed.order.amountOre, 115000);
    assert.equal(replay.claimed.order.id, first.claimed.order.id);
    assert.equal(store.pendingCount(customer.email, "pack-5"), 1);
  });

  it("replay with fake isMember is ignored; membership is server-verified", async () => {
    const store = createMemoryPackOrderStore();
    const sessions = createMemoryCheckoutSessions();

    const standard = await packCheckoutAttempt({
      store,
      sessions,
      membership: standardLookup(),
      clientIsMember: true,
      clientPriceTier: "vfg_member",
      clientAmount: 115000,
    });
    assert.equal(standard.priced.amountOre, 135000);
    assert.equal(standard.priced.priceTier, "standard");
    assert.equal(standard.claimed.order.vfgMemberVerified, false);

    const replay = await packCheckoutAttempt({
      store,
      sessions,
      membership: standardLookup(),
      clientIsMember: true,
      clientPriceTier: "vfg_member",
    });
    assert.equal(replay.priced.amountOre, 135000);
    assert.equal(replay.claimed.order.id, standard.claimed.order.id);
    assert.equal(store.pendingCount(customer.email, "pack-5"), 1);
  });

  it("charges 115000 for a verified member and 135000 for standard", async () => {
    const memberStore = createMemoryPackOrderStore();
    const standardStore = createMemoryPackOrderStore();
    const memberSessions = createMemoryCheckoutSessions();
    const standardSessions = createMemoryCheckoutSessions();

    const member = await packCheckoutAttempt({
      store: memberStore,
      sessions: memberSessions,
      membership: memberLookup(),
    });
    const standard = await packCheckoutAttempt({
      store: standardStore,
      sessions: standardSessions,
      membership: standardLookup(),
    });

    assert.equal(member.priced.amountOre, 115000);
    assert.equal(member.claimed.order.priceTier, "vfg_member");
    assert.equal(standard.priced.amountOre, 135000);
    assert.equal(standard.claimed.order.priceTier, "standard");
  });

  it("concurrent and repeated requests keep a single pending Order", async () => {
    const store = createMemoryPackOrderStore();
    const sessions = createMemoryCheckoutSessions();
    const membership = memberLookup();

    const [a, b, c] = await Promise.all([
      packCheckoutAttempt({ store, sessions, membership }),
      packCheckoutAttempt({ store, sessions, membership }),
      packCheckoutAttempt({ store, sessions, membership }),
    ]);

    const ids = [a, b, c].map((row) => row.claimed.order.id);
    assert.equal(new Set(ids).size, 1);
    assert.equal(store.pendingCount(customer.email, "pack-5"), 1);
    assert.equal(sessions.createCount, 1);

    const again = await packCheckoutAttempt({ store, sessions, membership });
    assert.equal(again.claimed.order.id, a.claimed.order.id);
    assert.equal(store.pendingCount(customer.email, "pack-5"), 1);
  });

  it("race resolver keeps the oldest pending Order and cancels extras", () => {
    const race = resolvePendingOrderRace([
      { id: "newer", createdAt: new Date("2026-09-20T00:00:02.000Z") },
      { id: "older", createdAt: new Date("2026-09-20T00:00:01.000Z") },
    ]);
    assert.equal(race.keep?.id, "older");
    assert.deepEqual(race.cancelIds, ["newer"]);
  });

  it("reuses an open session and replaces an expired one on the same Order", async () => {
    const store = createMemoryPackOrderStore();
    const sessions = createMemoryCheckoutSessions();
    const membership = memberLookup();
    const first = await packCheckoutAttempt({ store, sessions, membership });
    assert.equal(first.session.ok, true);
    if (!first.session.ok) return;

    sessions.seed({
      id: first.session.sessionId,
      url: "https://checkout.test/expired",
      status: "expired",
      payment_status: "unpaid",
      amount_total: 115000,
      expires_at: Math.floor(Date.now() / 1000) - 10,
    });

    const recovered = await packCheckoutAttempt({ store, sessions, membership });
    assert.equal(recovered.session.ok, true);
    if (!recovered.session.ok) return;
    assert.equal(recovered.claimed.order.id, first.claimed.order.id);
    assert.notEqual(recovered.session.sessionId, first.session.sessionId);
    assert.equal(recovered.session.reused, false);
    assert.equal(store.pendingCount(customer.email, "pack-5"), 1);
    assert.equal(sessions.createCount, 2);
  });

  it("does not start a second purchase when the existing session is already paid", async () => {
    const decision = evaluateExistingCheckoutSession(
      {
        id: "cs_paid",
        url: "https://checkout.test/paid",
        status: "complete",
        payment_status: "paid",
        amount_total: 115000,
      },
      115000
    );
    assert.equal(decision.action, "block");
    if (decision.action !== "block") return;
    assert.equal(decision.reason, "paid");
  });

  it("does not fail a pending Order when an older replaced session expires", () => {
    assert.equal(
      shouldApplyTerminalSessionToOrder(
        { status: "pending", stripeCheckoutSessionId: "cs_new" },
        "cs_old"
      ),
      false
    );
    assert.equal(
      shouldApplyTerminalSessionToOrder(
        { status: "pending", stripeCheckoutSessionId: "cs_new" },
        "cs_new"
      ),
      true
    );
    assert.equal(
      shouldApplyTerminalSessionToOrder(
        { status: "paid", stripeCheckoutSessionId: "cs_new" },
        "cs_new"
      ),
      false
    );
  });
});

function webhookSessionEvent(
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
        amount_total: 135000,
        currency: "dkk",
        payment_intent: "pi_1",
        metadata: { orderId: "ord_pack" },
        ...overrides.session,
      },
    },
  };
}

function packOrder(overrides: Partial<StripeWebhookOrder> = {}): StripeWebhookOrder {
  return {
    id: "ord_pack",
    productId: "pack-5",
    priceTier: "standard",
    vfgMemberVerified: false,
    chargedAmountOre: 135000,
    ...overrides,
  };
}

describe("webhook fulfillment stays idempotent after checkout reuse", () => {
  it("validates before claim; wrong amount 409; failure 500 retry; success 200; replay 200", async () => {
    const event = webhookSessionEvent();
    const order = packOrder();
    const ledger = createMemoryStripeEventLedger();
    const fulfillments: string[] = [];
    const failed: string[] = [];
    let fulfillShouldFail = true;

    async function run() {
      return processVerifiedStripeEvent({
        event,
        retrieveSession: async () => event.data.object,
        findOrder: async () => order,
        fulfillPaidOrder: async ({ orderId }) => {
          if (fulfillShouldFail) throw new Error("database down");
          fulfillments.push(orderId);
          return { ok: true as const };
        },
        failPendingOrder: async (orderId) => {
          failed.push(orderId);
        },
        ledger,
      });
    }

    const mismatch = await processVerifiedStripeEvent({
      event: webhookSessionEvent({ session: { amount_total: 1 } }),
      retrieveSession: async (sessionId) => ({
        ...event.data.object,
        id: sessionId,
        amount_total: 1,
      }),
      findOrder: async () => order,
      fulfillPaidOrder: async ({ orderId }) => {
        fulfillments.push(orderId);
        return { ok: true as const };
      },
      failPendingOrder: async () => undefined,
      ledger: createMemoryStripeEventLedger(),
    });
    assert.equal(mismatch.status, 409);
    assert.equal(mismatch.body.rejected, "amount_mismatch");
    assert.equal(mismatch.body.received, false);

    const failedAttempt = await run();
    assert.equal(failedAttempt.status, 500);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_FAILED);
    assert.equal(fulfillments.length, 0);

    fulfillShouldFail = false;
    const success = await run();
    assert.equal(success.status, 200);
    assert.equal(success.body.received, true);
    assert.equal(fulfillments.length, 1);
    assert.equal(await ledger.getStatus(event.id), STRIPE_EVENT_PROCESSED);

    const replay = await run();
    assert.equal(replay.status, 200);
    assert.equal(replay.body.duplicate, true);
    assert.equal(fulfillments.length, 1);
    assert.equal(failed.length, 0);
  });

  it("accepts both standard and member 5-clip amounts", async () => {
    const standard = await processVerifiedStripeEvent({
      event: webhookSessionEvent({ id: "evt_std" }),
      retrieveSession: async () => webhookSessionEvent().data.object,
      findOrder: async () => packOrder(),
      fulfillPaidOrder: async () => ({ ok: true as const }),
      failPendingOrder: async () => undefined,
      ledger: createMemoryStripeEventLedger(),
    });
    assert.equal(standard.status, 200);

    const memberEvent = webhookSessionEvent({
      id: "evt_mem",
      session: { amount_total: 115000, metadata: { orderId: "ord_mem" } },
    });
    const member = await processVerifiedStripeEvent({
      event: memberEvent,
      retrieveSession: async () => memberEvent.data.object,
      findOrder: async () =>
        packOrder({
          id: "ord_mem",
          priceTier: "vfg_member",
          vfgMemberVerified: true,
          chargedAmountOre: 115000,
        }),
      fulfillPaidOrder: async () => ({ ok: true as const }),
      failPendingOrder: async () => undefined,
      ledger: createMemoryStripeEventLedger(),
    });
    assert.equal(member.status, 200);
  });

  it("passes the Stripe session id into failPending so a replaced session is safe", async () => {
    const seen: Array<{ orderId: string; sessionId?: string | null }> = [];
    const event = webhookSessionEvent({
      id: "evt_exp",
      type: "checkout.session.expired",
      session: { id: "cs_old", payment_status: "unpaid" },
    });
    const result = await processVerifiedStripeEvent({
      event,
      retrieveSession: async () => event.data.object,
      findOrder: async () => packOrder(),
      fulfillPaidOrder: async () => ({ ok: true as const }),
      failPendingOrder: async (orderId, stripeCheckoutSessionId) => {
        seen.push({ orderId, sessionId: stripeCheckoutSessionId });
      },
      ledger: createMemoryStripeEventLedger(),
    });
    assert.equal(result.status, 200);
    assert.deepEqual(seen, [{ orderId: "ord_pack", sessionId: "cs_old" }]);
  });
});
