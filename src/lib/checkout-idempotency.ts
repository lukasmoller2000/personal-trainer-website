/**
 * Server-side checkout idempotency for 5-clip (and compatible session reuse).
 *
 * Why this key (no migration): Order has no requestId / unique idempotency
 * column. Client requestId, amount, isMember and priceTier are untrusted.
 * The logical attempt is (normalized email + productId) while an Order is
 * still pending. Concurrent creates are serialized with a Postgres advisory
 * lock (or an in-memory lock in tests), then extras are cancelled.
 *
 * Recovery: reuse the same pending Order row. If its Stripe session is still
 * open and charged the current server amount, return that session. If the
 * session is expired/invalid/amount-changed, create one replacement session
 * and overwrite stripeCheckoutSessionId. Do not open a second pending Order.
 * A later checkout.session.expired for the old session must not fail the
 * replacement — see shouldApplyTerminalSessionToOrder.
 */

export function normalizeCheckoutEmail(email: string) {
  return email.trim().toLowerCase();
}

export function packCheckoutIdempotencyKey(email: string, productId: string) {
  return `${normalizeCheckoutEmail(email)}|${productId}`;
}

export function stripeCheckoutIdempotencyKey(orderId: string, attempt: string) {
  return `checkout:${orderId}:${attempt}`;
}

export type CheckoutSessionView = {
  id: string;
  url?: string | null;
  status?: string | null;
  expires_at?: number | null;
  payment_status?: string | null;
  amount_total?: number | null;
};

export type ReuseCheckoutSession = {
  action: "reuse";
  url: string;
  sessionId: string;
};

export type ReplaceCheckoutSession = {
  action: "replace";
  reason: "missing" | "expired" | "invalid" | "amount_changed" | "no_url";
};

export type BlockCheckoutSession = {
  action: "block";
  reason: "complete" | "paid";
};

export type ExistingCheckoutSessionDecision =
  | ReuseCheckoutSession
  | ReplaceCheckoutSession
  | BlockCheckoutSession;

export function evaluateExistingCheckoutSession(
  session: CheckoutSessionView | null | undefined,
  expectedAmountOre: number,
  nowSec = Math.floor(Date.now() / 1000)
): ExistingCheckoutSessionDecision {
  if (!session?.id) {
    return { action: "replace", reason: "missing" };
  }

  if (session.payment_status === "paid") {
    return { action: "block", reason: "paid" };
  }
  if (session.status === "complete") {
    return { action: "block", reason: "complete" };
  }

  const expiredByStatus = session.status === "expired";
  const expiredByTime =
    typeof session.expires_at === "number" && session.expires_at <= nowSec;
  if (expiredByStatus || expiredByTime) {
    return { action: "replace", reason: "expired" };
  }

  if (session.status && session.status !== "open") {
    return { action: "replace", reason: "invalid" };
  }

  if (
    typeof session.amount_total === "number" &&
    session.amount_total !== expectedAmountOre
  ) {
    return { action: "replace", reason: "amount_changed" };
  }

  const url = session.url?.trim() ?? "";
  if (!url) {
    return { action: "replace", reason: "no_url" };
  }

  return { action: "reuse", url, sessionId: session.id };
}

export type PendingOrderRaceRow = {
  id: string;
  createdAt: Date;
};

export function resolvePendingOrderRace<T extends PendingOrderRaceRow>(pending: T[]) {
  const sorted = [...pending].sort((a, b) => {
    const byTime = a.createdAt.getTime() - b.createdAt.getTime();
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
  const keep = sorted[0] ?? null;
  return {
    keep,
    cancelIds: sorted.slice(1).map((row) => row.id),
  };
}

export function shouldApplyTerminalSessionToOrder(
  order: { status: string; stripeCheckoutSessionId: string | null },
  incomingSessionId?: string | null
) {
  if (order.status !== "pending") return false;
  if (
    incomingSessionId &&
    order.stripeCheckoutSessionId &&
    order.stripeCheckoutSessionId !== incomingSessionId
  ) {
    return false;
  }
  return true;
}

export type PackOrderRecord = {
  id: string;
  productId: string;
  status: string;
  amountOre: number;
  chargedAmountOre: number | null;
  priceTier: string;
  vfgMemberVerified: boolean;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  goal: string;
  notes: string | null;
  stripeCheckoutSessionId: string | null;
  createdAt: Date;
};

export type PackOrderWrite = {
  productId: string;
  amountOre: number;
  chargedAmountOre: number;
  priceTier: string;
  vfgMemberVerified: boolean;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  goal: string;
  notes: string | null;
};

export type PackOrderStore = {
  withLock<T>(key: string, fn: () => Promise<T>): Promise<T>;
  findPending(email: string, productId: string): Promise<PackOrderRecord[]>;
  create(data: PackOrderWrite): Promise<PackOrderRecord>;
  update(id: string, data: PackOrderWrite): Promise<PackOrderRecord>;
  cancel(id: string): Promise<void>;
};

export async function claimPendingPackOrder(input: {
  store: PackOrderStore;
  productId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    goal: string;
    notes?: string;
  };
  amountOre: number;
  priceTier: string;
  vfgMemberVerified: boolean;
}) {
  const email = normalizeCheckoutEmail(input.customer.email);
  const key = packCheckoutIdempotencyKey(email, input.productId);
  const write: PackOrderWrite = {
    productId: input.productId,
    amountOre: input.amountOre,
    chargedAmountOre: input.amountOre,
    priceTier: input.priceTier,
    vfgMemberVerified: input.vfgMemberVerified,
    customerEmail: email,
    customerName: input.customer.name,
    customerPhone: input.customer.phone,
    goal: input.customer.goal,
    notes: input.customer.notes ?? null,
  };

  return input.store.withLock(key, async () => {
    const pending = await input.store.findPending(email, input.productId);
    const race = resolvePendingOrderRace(pending);
    for (const id of race.cancelIds) {
      await input.store.cancel(id);
    }
    if (race.keep) {
      const order = await input.store.update(race.keep.id, write);
      return { order, created: false };
    }
    const order = await input.store.create(write);
    return { order, created: true };
  });
}

export type CheckoutSessionPort = {
  retrieve(id: string): Promise<CheckoutSessionView | null>;
  create(idempotencyKey: string): Promise<CheckoutSessionView>;
};

export type EnsureCheckoutSessionResult =
  | { ok: true; url: string; sessionId: string; reused: boolean }
  | { ok: false; reason: "complete" | "paid" | "no_url" };

export async function ensureOpenCheckoutSession(input: {
  orderId: string;
  existingSessionId: string | null;
  expectedAmountOre: number;
  sessions: CheckoutSessionPort;
  attachSession: (orderId: string, sessionId: string) => Promise<void>;
  nowSec?: number;
}): Promise<EnsureCheckoutSessionResult> {
  const existing = input.existingSessionId
    ? await input.sessions.retrieve(input.existingSessionId)
    : null;
  const decision = evaluateExistingCheckoutSession(
    existing,
    input.expectedAmountOre,
    input.nowSec
  );

  if (decision.action === "reuse") {
    return {
      ok: true,
      url: decision.url,
      sessionId: decision.sessionId,
      reused: true,
    };
  }
  if (decision.action === "block") {
    return { ok: false, reason: decision.reason };
  }

  const session = await input.sessions.create(
    stripeCheckoutIdempotencyKey(input.orderId, input.existingSessionId ?? "new")
  );
  const url = session.url?.trim() ?? "";
  if (!url) {
    return { ok: false, reason: "no_url" };
  }
  await input.attachSession(input.orderId, session.id);
  return { ok: true, url, sessionId: session.id, reused: false };
}

export function createMemoryPackOrderStore() {
  const orders = new Map<string, PackOrderRecord>();
  const lockTails = new Map<string, Promise<void>>();
  let seq = 0;

  const store: PackOrderStore & {
    orders: Map<string, PackOrderRecord>;
    pendingCount(email: string, productId: string): number;
    attach(orderId: string, sessionId: string): void;
  } = {
    orders,
    pendingCount(email, productId) {
      const normalized = normalizeCheckoutEmail(email);
      return [...orders.values()].filter(
        (row) =>
          row.status === "pending" &&
          row.customerEmail === normalized &&
          row.productId === productId
      ).length;
    },
    async withLock(key, fn) {
      const previous = lockTails.get(key) ?? Promise.resolve();
      let release!: () => void;
      const current = new Promise<void>((resolve) => {
        release = resolve;
      });
      lockTails.set(
        key,
        previous.then(() => current)
      );
      await previous;
      try {
        return await fn();
      } finally {
        release();
      }
    },
    async findPending(email, productId) {
      const normalized = normalizeCheckoutEmail(email);
      return [...orders.values()].filter(
        (row) =>
          row.status === "pending" &&
          row.customerEmail === normalized &&
          row.productId === productId
      );
    },
    async create(data) {
      seq += 1;
      const order: PackOrderRecord = {
        id: `ord_${seq}`,
        status: "pending",
        stripeCheckoutSessionId: null,
        createdAt: new Date(),
        ...data,
      };
      orders.set(order.id, order);
      return order;
    },
    async update(id, data) {
      const existing = orders.get(id);
      if (!existing) throw new Error("missing order");
      const next = { ...existing, ...data };
      orders.set(id, next);
      return next;
    },
    async cancel(id) {
      const existing = orders.get(id);
      if (!existing) return;
      orders.set(id, { ...existing, status: "cancelled" });
    },
    attach(orderId: string, sessionId: string) {
      const existing = orders.get(orderId);
      if (!existing) return;
      orders.set(orderId, { ...existing, stripeCheckoutSessionId: sessionId });
    },
  };

  return store;
}

export function createMemoryCheckoutSessions() {
  const sessions = new Map<string, CheckoutSessionView>();
  const byKey = new Map<string, CheckoutSessionView>();
  let seq = 0;
  const createdKeys: string[] = [];

  return {
    sessions,
    createdKeys,
    get createCount() {
      return createdKeys.length;
    },
    seed(session: CheckoutSessionView) {
      sessions.set(session.id, session);
    },
    async retrieve(id: string) {
      return sessions.get(id) ?? null;
    },
    async create(idempotencyKey: string, view?: Partial<CheckoutSessionView>) {
      const existing = byKey.get(idempotencyKey);
      if (existing) return existing;
      seq += 1;
      const session: CheckoutSessionView = {
        id: `cs_${seq}`,
        url: `https://checkout.test/cs_${seq}`,
        status: "open",
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        payment_status: "unpaid",
        ...view,
      };
      sessions.set(session.id, session);
      byKey.set(idempotencyKey, session);
      createdKeys.push(idempotencyKey);
      return session;
    },
  };
}
