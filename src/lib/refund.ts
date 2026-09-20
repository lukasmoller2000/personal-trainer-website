/**
 * Admin refund: Stripe is source of truth. The DB is updated only after a
 * confirmed Stripe refund for this Order's stored PaymentIntent.
 * Client amount / PaymentIntent / Stripe account are ignored.
 */

import { BOOKING_STATUS, bookingStatusAfterRefund } from "@/lib/booking-payment";
import { canRefundUnusedClipCard, canTransitionOrder } from "@/lib/commerce";
import { getPrisma } from "@/lib/db";
import { claimStripeEvent, isStripeEventProcessed } from "@/lib/clip-cards";
import { trySendCustomerEmail, trySendNotification } from "@/lib/mail";
import { getProduct } from "@/lib/products";
import { getStripe } from "@/lib/stripe";
import {
  adminRefundProductName,
  buildRefundCustomerEmail,
  evaluateRefundEligibility,
  refundAmountOre,
  refundIdempotencyKey,
  refundMailClaimId,
  type RefundableOrderSnapshot,
} from "@/lib/refund-policy";
import { priceLabel } from "@/lib/utils";

export {
  buildRefundCustomerEmail,
  canShowAdminRefund,
  evaluateRefundEligibility,
  refundAmountOre,
  refundIdempotencyKey,
  refundMailClaimId,
} from "@/lib/refund-policy";

export class RefundError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RefundError";
    this.status = status;
  }
}

export type RefundPaymentIntent = {
  id: string;
  status: string;
  amount: number;
  currency?: string | null;
  amountRefunded?: number | null;
};

export type RefundCheckoutSession = {
  id: string;
  paymentIntentId?: string | null;
  amountTotal?: number | null;
  paymentStatus?: string | null;
};

export type StripeRefundRecord = {
  id: string;
  status: string;
  amount: number;
  paymentIntentId?: string | null;
};

export type StripeRefundApi = {
  retrievePaymentIntent: (id: string) => Promise<RefundPaymentIntent | null>;
  retrieveCheckoutSession: (id: string) => Promise<RefundCheckoutSession | null>;
  listRefunds: (paymentIntentId: string) => Promise<StripeRefundRecord[]>;
  createRefund: (input: {
    paymentIntentId: string;
    amount: number;
    idempotencyKey: string;
  }) => Promise<StripeRefundRecord>;
};

export type RefundOrderRecord = RefundableOrderSnapshot & {
  id: string;
  customerName: string;
  customerEmail: string;
  date?: string | null;
  time?: string | null;
  clipCard: {
    id: string;
    status: string;
    remaining: number;
    totalSessions: number;
  } | null;
  bookings: Array<{ id: string; productId: string; status: string }>;
};

export type RefundStore = {
  findOrder: (orderId: string) => Promise<RefundOrderRecord | null>;
  applyLocalRefund: (input: {
    orderId: string;
    clipCardId?: string | null;
    bookingIds: string[];
  }) => Promise<RefundOrderRecord | null>;
};

export type RefundMailer = {
  sendCustomer: (input: { to: string; subject: string; text: string }) => Promise<void>;
  notify?: (input: { subject: string; text: string; replyTo?: string }) => Promise<void>;
};

export type RefundMailLedger = {
  alreadySent: (id: string) => Promise<boolean>;
  claim: (id: string) => Promise<"new" | "duplicate" | "skipped">;
};

export type RefundPaidOrderInput = {
  orderId: string;
  /** Ignored. Amount always comes from the Order / Stripe PaymentIntent. */
  clientAmount?: unknown;
  /** Ignored. PaymentIntent always comes from the stored Order / Checkout Session. */
  clientPaymentIntent?: unknown;
  /** Ignored. Refunds always use the server Stripe account. */
  clientStripeAccount?: unknown;
  stripe: StripeRefundApi;
  store: RefundStore;
  mail?: RefundMailer;
  mailLedger?: RefundMailLedger;
};

export type RefundPaidOrderResult = {
  ok: true;
  alreadyRefunded: boolean;
  orderId: string;
  status: "refunded";
  refundId: string;
  amountOre: number;
  mailSent: boolean;
};

const SUCCEEDED_REFUND = new Set(["succeeded", "pending"]);

export function isConfirmedStripeRefund(status: string) {
  return status === "succeeded";
}

export function isUsableStripeRefund(status: string) {
  return SUCCEEDED_REFUND.has(status);
}

function paymentIntentIdFromSession(session: RefundCheckoutSession) {
  return session.paymentIntentId?.trim() || "";
}

export function pickExistingStripeRefund(
  refunds: StripeRefundRecord[],
  paymentIntentId: string,
  amountOre: number
) {
  return (
    refunds.find(
      (row) =>
        isUsableStripeRefund(row.status) &&
        (row.paymentIntentId == null || row.paymentIntentId === paymentIntentId) &&
        row.amount === amountOre
    ) ??
    refunds.find(
      (row) => isUsableStripeRefund(row.status) && row.paymentIntentId === paymentIntentId
    ) ??
    null
  );
}

async function resolveStoredPaymentIntent(
  order: RefundOrderRecord,
  stripe: StripeRefundApi
): Promise<RefundPaymentIntent> {
  let paymentIntentId = order.stripePaymentIntentId?.trim() || "";
  if (!paymentIntentId && order.stripeCheckoutSessionId) {
    const session = await stripe.retrieveCheckoutSession(order.stripeCheckoutSessionId);
    paymentIntentId = session ? paymentIntentIdFromSession(session) : "";
  }
  if (!paymentIntentId) {
    throw new RefundError("Betalingen kan ikke verificeres i Stripe", 409);
  }

  const paymentIntent = await stripe.retrievePaymentIntent(paymentIntentId);
  if (!paymentIntent) {
    throw new RefundError("Betalingen kan ikke verificeres i Stripe", 409);
  }
  if (paymentIntent.id !== paymentIntentId) {
    throw new RefundError("Betalingen kan ikke verificeres i Stripe", 409);
  }
  if (paymentIntent.status !== "succeeded" && (paymentIntent.amountRefunded ?? 0) <= 0) {
    throw new RefundError("Betalingen er ikke gennemført i Stripe", 409);
  }
  if (paymentIntent.amount <= 0) {
    throw new RefundError("Beløbet kan ikke refunderes", 409);
  }
  return paymentIntent;
}

async function applyLocalRefundIfNeeded(
  store: RefundStore,
  order: RefundOrderRecord
): Promise<RefundOrderRecord> {
  if (order.status === "refunded") return order;

  if (order.productId === "pack-5") {
    const clip = canRefundUnusedClipCard(order.clipCard);
    if (!clip.ok) {
      throw new RefundError(clip.error, 409);
    }
  }

  const bookingIds =
    order.productId === "session"
      ? order.bookings
          .filter((row) => bookingStatusAfterRefund(row.status) === BOOKING_STATUS.cancelled)
          .filter((row) => row.status !== BOOKING_STATUS.cancelled)
          .map((row) => row.id)
      : [];

  const updated = await store.applyLocalRefund({
    orderId: order.id,
    clipCardId: order.clipCard?.id ?? null,
    bookingIds,
  });
  if (!updated || updated.status !== "refunded") {
    throw new RefundError("Kunne ikke opdatere ordren efter refundering", 500);
  }
  return updated;
}

async function sendRefundMailOnce(input: {
  order: RefundOrderRecord;
  refundId: string;
  amountOre: number;
  mail?: RefundMailer;
  mailLedger?: RefundMailLedger;
}): Promise<boolean> {
  if (!input.mail) return false;
  const claimId = refundMailClaimId(input.order.id, input.refundId);
  if (input.mailLedger && (await input.mailLedger.alreadySent(claimId))) {
    return false;
  }

  const productName = adminRefundProductName(input.order.productId);
  const mail = buildRefundCustomerEmail({
    name: input.order.customerName,
    productName,
    amountOre: input.amountOre,
    date: input.order.date,
    time: input.order.time,
  });

  try {
    await input.mail.sendCustomer({
      to: input.order.customerEmail,
      subject: mail.subject,
      text: mail.text,
    });
    if (input.mail.notify) {
      const amount = priceLabel({ price: input.amountOre / 100, tagline: "" });
      await input.mail.notify({
        subject: `Refunderet ordre: ${input.order.customerName} · ${productName}`,
        text: [
          "Ordren er refunderet i Stripe.",
          "",
          `Ordre: ${input.order.id}`,
          `Ydelse: ${productName}`,
          `Navn: ${input.order.customerName}`,
          `Email: ${input.order.customerEmail}`,
          `Beløb: ${amount}`,
          `Stripe refund: ${input.refundId}`,
        ].join("\n"),
        replyTo: input.order.customerEmail,
      });
    }
  } catch (error) {
    console.error(
      "Kunde-mail kunne ikke sendes",
      error instanceof Error ? error.name : "unknown"
    );
    return false;
  }

  if (input.mailLedger) {
    await input.mailLedger.claim(claimId);
  }
  return true;
}

export async function refundPaidOrder(
  input: RefundPaidOrderInput
): Promise<RefundPaidOrderResult> {
  void input.clientAmount;
  void input.clientPaymentIntent;
  void input.clientStripeAccount;

  const orderId = input.orderId.trim();
  if (!orderId) {
    throw new RefundError("Ordre mangler", 400);
  }

  const existing = await input.store.findOrder(orderId);
  if (!existing) {
    throw new RefundError("Ordren blev ikke fundet", 404);
  }

  if (existing.status === "refunded") {
    let refundId = "";
    let amountOre = refundAmountOre(existing);
    try {
      const paymentIntent = await resolveStoredPaymentIntent(existing, input.stripe);
      amountOre = paymentIntent.amount;
      const refunds = await input.stripe.listRefunds(paymentIntent.id);
      refundId = pickExistingStripeRefund(refunds, paymentIntent.id, amountOre)?.id ?? "";
    } catch {
      refundId = "";
    }
    return {
      ok: true,
      alreadyRefunded: true,
      orderId: existing.id,
      status: "refunded",
      refundId,
      amountOre,
      mailSent: false,
    };
  }

  const eligibility = evaluateRefundEligibility(existing, existing.clipCard);
  if (!eligibility.ok) {
    throw new RefundError(eligibility.error, 409);
  }

  const paymentIntent = await resolveStoredPaymentIntent(existing, input.stripe);
  const amountOre = paymentIntent.amount;
  const existingRefunds = await input.stripe.listRefunds(paymentIntent.id);
  const already = pickExistingStripeRefund(existingRefunds, paymentIntent.id, amountOre);

  let refund = already;
  if (!refund) {
    try {
      refund = await input.stripe.createRefund({
        paymentIntentId: paymentIntent.id,
        amount: amountOre,
        idempotencyKey: refundIdempotencyKey(existing.id),
      });
    } catch (error) {
      console.error("Stripe-refund fejlede", error instanceof Error ? error.name : "unknown");
      const replay = await input.stripe.listRefunds(paymentIntent.id).catch(() => []);
      refund = pickExistingStripeRefund(replay, paymentIntent.id, amountOre);
      if (!refund) {
        throw new RefundError("Stripe kunne ikke refundere betalingen", 502);
      }
    }
  }

  if (!isUsableStripeRefund(refund.status)) {
    throw new RefundError("Stripe kunne ikke refundere betalingen", 502);
  }

  const updated = await applyLocalRefundIfNeeded(input.store, existing);
  const mailSent = await sendRefundMailOnce({
    order: updated,
    refundId: refund.id,
    amountOre,
    mail: input.mail,
    mailLedger: input.mailLedger,
  });

  return {
    ok: true,
    alreadyRefunded: Boolean(already),
    orderId: updated.id,
    status: "refunded",
    refundId: refund.id,
    amountOre,
    mailSent,
  };
}

export function createStripeRefundApi(): StripeRefundApi | null {
  const stripe = getStripe();
  if (!stripe) return null;

  return {
    async retrievePaymentIntent(id) {
      const pi = await stripe.paymentIntents.retrieve(id, { expand: ["latest_charge"] });
      const charge =
        typeof pi.latest_charge === "object" && pi.latest_charge
          ? pi.latest_charge
          : null;
      return {
        id: pi.id,
        status: pi.status,
        amount: pi.amount,
        currency: pi.currency,
        amountRefunded: charge && "amount_refunded" in charge ? charge.amount_refunded : null,
      };
    },
    async retrieveCheckoutSession(id) {
      const session = await stripe.checkout.sessions.retrieve(id);
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
      return {
        id: session.id,
        paymentIntentId: paymentIntent,
        amountTotal: session.amount_total,
        paymentStatus: session.payment_status,
      };
    },
    async listRefunds(paymentIntentId) {
      const listed = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 20 });
      return listed.data.map((row) => ({
        id: row.id,
        status: row.status ?? "unknown",
        amount: row.amount,
        paymentIntentId:
          typeof row.payment_intent === "string"
            ? row.payment_intent
            : row.payment_intent?.id ?? paymentIntentId,
      }));
    },
    async createRefund({ paymentIntentId, amount, idempotencyKey }) {
      const created = await stripe.refunds.create(
        { payment_intent: paymentIntentId, amount },
        { idempotencyKey }
      );
      return {
        id: created.id,
        status: created.status ?? "unknown",
        amount: created.amount,
        paymentIntentId:
          typeof created.payment_intent === "string"
            ? created.payment_intent
            : created.payment_intent?.id ?? paymentIntentId,
      };
    },
  };
}

export function createPrismaRefundStore(): RefundStore {
  return {
    async findOrder(orderId) {
      const prisma = getPrisma();
      if (!prisma) return null;
      return prisma.order.findUnique({
        where: { id: orderId },
        include: { clipCard: true, bookings: true },
      });
    },
    async applyLocalRefund({ orderId, clipCardId, bookingIds }) {
      const prisma = getPrisma();
      if (!prisma) throw new RefundError("Databasen er ikke tilgængelig", 503);

      return prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { clipCard: true, bookings: true },
        });
        if (!order) return null;
        if (order.status === "refunded") return order;
        if (!canTransitionOrder(order.status, "refunded")) {
          throw new RefundError("Kun betalte ordrer kan refunderes", 409);
        }

        if (order.productId === "pack-5") {
          const clip = canRefundUnusedClipCard(order.clipCard);
          if (!clip.ok) {
            throw new RefundError(clip.error, 409);
          }
        }

        if (clipCardId && order.clipCard?.id === clipCardId) {
          await tx.clipCard.update({
            where: { id: clipCardId },
            data: { remaining: 0, status: "cancelled" },
          });
        }

        if (bookingIds.length > 0) {
          await tx.booking.updateMany({
            where: { id: { in: bookingIds }, orderId },
            data: { status: BOOKING_STATUS.cancelled, cancelledAt: new Date() },
          });
        }

        return tx.order.update({
          where: { id: orderId },
          data: { status: "refunded" },
          include: { clipCard: true, bookings: true },
        });
      });
    },
  };
}

export function createRefundMailer(): RefundMailer {
  return {
    sendCustomer: trySendCustomerEmail,
    notify: trySendNotification,
  };
}

export function createRefundMailLedger(): RefundMailLedger {
  return {
    alreadySent: isStripeEventProcessed,
    claim: (id) => claimStripeEvent(id, "refund.customer_mail"),
  };
}

export async function refundPaidOrderFromAdmin(
  orderId: string,
  ignoredClient?: {
    amount?: unknown;
    paymentIntent?: unknown;
    stripeAccount?: unknown;
  }
) {
  const stripe = createStripeRefundApi();
  if (!stripe) {
    throw new RefundError("Stripe er ikke konfigureret", 503);
  }
  if (!getPrisma()) {
    throw new RefundError("Databasen er ikke tilgængelig", 503);
  }

  return refundPaidOrder({
    orderId,
    clientAmount: ignoredClient?.amount,
    clientPaymentIntent: ignoredClient?.paymentIntent,
    clientStripeAccount: ignoredClient?.stripeAccount,
    stripe,
    store: createPrismaRefundStore(),
    mail: createRefundMailer(),
    mailLedger: createRefundMailLedger(),
  });
}

export function refundProductName(productId: string) {
  return getProduct(productId)?.name ?? productId;
}
