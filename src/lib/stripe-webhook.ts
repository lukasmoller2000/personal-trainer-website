/**
 * Verified Stripe webhook processing.
 *
 * A StripeEvent row is a PROCESSED lock only. Catalog/amount mismatches and
 * fulfillment errors must not create that lock. Recovery: Stripe retries on
 * 409/500; the same event can fulfill later once the cause is fixed.
 */

import {
  buildFailedPaymentCustomerEmail,
  resolveFailedPaymentRetryUrl,
} from "@/lib/booking-payment";
import {
  claimStripeEvent,
  isStripeEventProcessed,
  releaseStripeEvent,
} from "@/lib/clip-cards";
import { getPrisma } from "@/lib/db";
import { isValidEmail, trySendCustomerEmail } from "@/lib/mail";
import { failPendingOrder, fulfillPaidOrder } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import {
  matchStripePaymentToCatalog,
  type StoredCheckoutPricing,
} from "@/lib/stripe-fulfillment";
import { siteConfig } from "@/lib/utils";

export const STRIPE_EVENT_PROCESSED = "processed" as const;
export const STRIPE_EVENT_FAILED = "failed" as const;
export const STRIPE_EVENT_NONE = "none" as const;

export type StripeEventLedgerStatus =
  | typeof STRIPE_EVENT_PROCESSED
  | typeof STRIPE_EVENT_FAILED
  | typeof STRIPE_EVENT_NONE;

export type StripeEventLedger = {
  getStatus(id: string): Promise<StripeEventLedgerStatus>;
  markProcessed(id: string, type: string): Promise<"new" | "duplicate" | "skipped">;
  markFailed(id: string, reason: string): Promise<void>;
};

export type StripeWebhookSession = {
  id: string;
  payment_status?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
  line_items?: {
    data?: Array<{
      price?: string | { id?: string } | null;
    }>;
  } | null;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: { object: StripeWebhookSession };
};

export type StripeWebhookOrder = StoredCheckoutPricing & {
  id: string;
  productId: string;
  customerEmail?: string | null;
  customerName?: string | null;
  date?: string | null;
  time?: string | null;
  status?: string | null;
  bookings?: Array<{
    id: string;
    productId: string;
    status: string;
    date?: string | null;
    time?: string | null;
    holdUntil?: Date | null;
  }>;
};

export type StripeWebhookResult = {
  status: number;
  body: {
    received?: boolean;
    duplicate?: boolean;
    ignored?: boolean;
    rejected?: string;
    error?: string;
  };
};

export type ProcessVerifiedStripeEventInput = {
  event: StripeWebhookEvent;
  retrieveSession: (sessionId: string) => Promise<StripeWebhookSession>;
  findOrder: (orderId: string) => Promise<StripeWebhookOrder | null>;
  fulfillPaidOrder: (input: {
    orderId: string;
    stripePaymentIntentId?: string | null;
  }) => Promise<unknown>;
  failPendingOrder: (
    orderId: string,
    stripeCheckoutSessionId?: string | null
  ) => Promise<unknown>;
  notifyFailedPayment?: (order: StripeWebhookOrder) => Promise<void>;
  ledger: StripeEventLedger;
};

const CHECKOUT_COMPLETED = "checkout.session.completed";
const CHECKOUT_EXPIRED = "checkout.session.expired";
const CHECKOUT_ASYNC_FAILED = "checkout.session.async_payment_failed";
const PAYMENT_INTENT_FAILED = "payment_intent.payment_failed";

export function orderIdFromStripeSession(session: {
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
}) {
  if (typeof session.metadata?.orderId === "string" && session.metadata.orderId) {
    return session.metadata.orderId;
  }
  if (typeof session.client_reference_id === "string" && session.client_reference_id) {
    return session.client_reference_id;
  }
  return "";
}

export function priceIdsFromStripeSession(session: StripeWebhookSession) {
  const priceIds: string[] = [];
  for (const item of session.line_items?.data ?? []) {
    const price = item.price;
    if (typeof price === "string") priceIds.push(price);
    else if (price?.id) priceIds.push(price.id);
  }
  return priceIds;
}

export function createMemoryStripeEventLedger() {
  const rows = new Map<string, { status: StripeEventLedgerStatus; type: string; reason?: string }>();
  const ledger: StripeEventLedger & {
    records: typeof rows;
  } = {
    records: rows,
    async getStatus(id) {
      return rows.get(id)?.status ?? STRIPE_EVENT_NONE;
    },
    async markProcessed(id, type) {
      if (rows.get(id)?.status === STRIPE_EVENT_PROCESSED) return "duplicate";
      rows.set(id, { status: STRIPE_EVENT_PROCESSED, type });
      return "new";
    },
    async markFailed(id, reason) {
      if (rows.get(id)?.status === STRIPE_EVENT_PROCESSED) return;
      rows.set(id, { status: STRIPE_EVENT_FAILED, type: rows.get(id)?.type ?? "", reason });
    },
  };
  return ledger;
}

export function createPrismaStripeEventLedger(): StripeEventLedger {
  return {
    async getStatus(id) {
      return (await isStripeEventProcessed(id)) ? STRIPE_EVENT_PROCESSED : STRIPE_EVENT_NONE;
    },
    async markProcessed(id, type) {
      return claimStripeEvent(id, type);
    },
    async markFailed(id) {
      await releaseStripeEvent(id);
    },
  };
}

export function createDefaultStripeWebhookDeps(retrieveSession: ProcessVerifiedStripeEventInput["retrieveSession"]) {
  return {
    retrieveSession,
    async findOrder(orderId: string) {
      const prisma = getPrisma();
      if (!prisma) return null;
      return prisma.order.findUnique({
        where: { id: orderId },
        include: { bookings: true },
      });
    },
    fulfillPaidOrder,
    failPendingOrder,
    notifyFailedPayment: sendFailedPaymentCustomerEmail,
    ledger: createPrismaStripeEventLedger(),
  };
}

export async function sendFailedPaymentCustomerEmail(order: StripeWebhookOrder) {
  const email = order.customerEmail?.trim() ?? "";
  if (!isValidEmail(email)) return;
  const mail = buildFailedPaymentCustomerEmail({
    name: order.customerName,
    productName: getProduct(order.productId)?.name ?? order.productId,
    date: order.date,
    time: order.time,
    retryUrl: resolveFailedPaymentRetryUrl(order),
    contactEmail: siteConfig.links.email,
  });
  await trySendCustomerEmail({
    to: email,
    subject: mail.subject,
    text: mail.text,
  });
}

function paymentIntentId(session: StripeWebhookSession) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

function fulfillmentRejected(result: unknown) {
  return Boolean(
    result &&
      typeof result === "object" &&
      "ok" in result &&
      (result as { ok?: unknown }).ok === false
  );
}

function duplicateResult(): StripeWebhookResult {
  return { status: 200, body: { received: true, duplicate: true } };
}

function rejectedResult(reason: string): StripeWebhookResult {
  return { status: 409, body: { received: false, rejected: reason } };
}

function failedResult(): StripeWebhookResult {
  return { status: 500, body: { error: "Webhook fejlede" } };
}

async function failEvent(
  ledger: StripeEventLedger,
  event: StripeWebhookEvent,
  reason: string
): Promise<StripeWebhookResult> {
  await ledger.markFailed(event.id, reason);
  return failedResult();
}

export async function processVerifiedStripeEvent(
  input: ProcessVerifiedStripeEventInput
): Promise<StripeWebhookResult> {
  const { event, ledger } = input;

  if ((await ledger.getStatus(event.id)) === STRIPE_EVENT_PROCESSED) {
    return duplicateResult();
  }

  if (event.type === CHECKOUT_COMPLETED) {
    return processCheckoutCompleted(input);
  }

  if (event.type === CHECKOUT_EXPIRED || event.type === CHECKOUT_ASYNC_FAILED) {
    return processCheckoutTerminal(input);
  }

  if (event.type === PAYMENT_INTENT_FAILED) {
    return processPaymentIntentFailed(input);
  }

  return { status: 200, body: { received: true, ignored: true } };
}

async function processCheckoutCompleted(input: ProcessVerifiedStripeEventInput) {
  const { event, ledger } = input;
  const session = event.data.object;
  const orderId = orderIdFromStripeSession(session);
  if (!orderId) {
    console.error("Stripe session uden orderId");
    return failEvent(ledger, event, "missing_order_id");
  }

  let order: StripeWebhookOrder | null;
  try {
    order = await input.findOrder(orderId);
  } catch (error) {
    console.error("Webhook-behandling fejlede", event.id, error instanceof Error ? error.name : "unknown");
    return failEvent(ledger, event, "order_lookup_failed");
  }

  if (!order) {
    console.error("Stripe session uden lokal ordre");
    return failEvent(ledger, event, "missing_order");
  }

  let fullSession: StripeWebhookSession;
  try {
    fullSession = await input.retrieveSession(session.id);
  } catch (error) {
    console.error("Webhook-behandling fejlede", event.id, error instanceof Error ? error.name : "unknown");
    return failEvent(ledger, event, "session_lookup_failed");
  }

  const match = matchStripePaymentToCatalog(
    order.productId,
    {
      paymentStatus: fullSession.payment_status,
      amountTotal: fullSession.amount_total,
      currency: fullSession.currency,
      priceIds: priceIdsFromStripeSession(fullSession),
      metadataAmount: session.metadata?.amount,
    },
    {
      priceTier: order.priceTier,
      vfgMemberVerified: order.vfgMemberVerified,
      chargedAmountOre: order.chargedAmountOre,
    }
  );

  if (!match.ok) {
    console.error("Stripe-betaling matchede ikke kataloget", match.reason);
    await ledger.markFailed(event.id, match.reason);
    return rejectedResult(match.reason);
  }

  try {
    const fulfilled = await input.fulfillPaidOrder({
      orderId,
      stripePaymentIntentId: paymentIntentId(session),
    });
    if (fulfillmentRejected(fulfilled)) {
      console.error("Webhook-behandling fejlede", event.id, "fulfillment");
      return failEvent(ledger, event, "fulfillment_rejected");
    }
  } catch (error) {
    console.error("Webhook-behandling fejlede", event.id, error instanceof Error ? error.name : "unknown");
    return failEvent(ledger, event, "fulfillment_failed");
  }

  const claimed = await ledger.markProcessed(event.id, event.type);
  if (claimed === "duplicate") return duplicateResult();
  return { status: 200, body: { received: true } };
}

async function processCheckoutTerminal(input: ProcessVerifiedStripeEventInput) {
  const { event, ledger } = input;
  const orderId = orderIdFromStripeSession(event.data.object);
  if (orderId) {
    try {
      await input.failPendingOrder(orderId, event.data.object.id);
    } catch (error) {
      console.error("Webhook-behandling fejlede", event.id, error instanceof Error ? error.name : "unknown");
      return failEvent(ledger, event, "fail_pending_failed");
    }
  }

  const claimed = await ledger.markProcessed(event.id, event.type);
  if (claimed === "duplicate") return duplicateResult();
  if (event.type === CHECKOUT_ASYNC_FAILED && orderId) {
    await safeNotifyFailedPayment(input, orderId);
  }
  return { status: 200, body: { received: true } };
}

async function processPaymentIntentFailed(input: ProcessVerifiedStripeEventInput) {
  const { event, ledger } = input;
  const orderId = orderIdFromStripeSession(event.data.object);

  if (orderId) {
    let order: StripeWebhookOrder | null;
    try {
      order = await input.findOrder(orderId);
    } catch (error) {
      console.error(
        "Webhook-behandling fejlede",
        event.id,
        error instanceof Error ? error.name : "unknown"
      );
      return failEvent(ledger, event, "order_lookup_failed");
    }

    const claimed = await ledger.markProcessed(event.id, event.type);
    if (claimed === "duplicate") return duplicateResult();
    if (order) {
      await safeNotifyFailedPayment(input, orderId, order);
    }
    return { status: 200, body: { received: true } };
  }

  const claimed = await ledger.markProcessed(event.id, event.type);
  if (claimed === "duplicate") return duplicateResult();
  return { status: 200, body: { received: true } };
}

async function safeNotifyFailedPayment(
  input: ProcessVerifiedStripeEventInput,
  orderId: string,
  knownOrder?: StripeWebhookOrder | null
) {
  if (!input.notifyFailedPayment) return;
  try {
    const order = knownOrder === undefined ? await input.findOrder(orderId) : knownOrder;
    if (!order) return;
    const email = order.customerEmail?.trim() ?? "";
    if (!isValidEmail(email)) return;
    await input.notifyFailedPayment(order);
  } catch (error) {
    console.error(
      "Kunde-mail kunne ikke sendes",
      error instanceof Error ? error.name : "unknown"
    );
  }
}
