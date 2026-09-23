import { randomUUID } from "crypto";
import {
  BOOKING_STATUS,
  bookingStatusAfterCheckoutExpired,
  evaluateSessionPayment,
} from "@/lib/booking-payment";
import {
  calculateVat,
  canTransitionOrder,
  getVatSettings,
  isUniqueConstraintError,
  type OrderStatus,
} from "@/lib/commerce";
import { getPrisma, holdUntilFromNow } from "@/lib/db";
import { trySendCustomerEmail, trySendNotification } from "@/lib/mail";
import {
  normalizeCheckoutEmail,
  packCheckoutIdempotencyKey,
  resolvePendingOrderRace,
  shouldApplyTerminalSessionToOrder,
} from "@/lib/checkout-idempotency";
import { resolveCheckoutPrice, type PriceTier } from "@/lib/checkout-price";
import { getProduct } from "@/lib/products";
import { planClipCardActivation } from "@/lib/stripe-fulfillment";
import {
  isActiveVfgMember,
  lookupVfgMembership,
  type VfgMembershipLookup,
  type VfgMembershipLookupResult,
} from "@/lib/vfg-membership";
import { formatDate, getSiteUrl, priceLabel } from "@/lib/utils";

export type CheckoutCustomer = {
  name: string;
  email: string;
  phone: string;
  goal: string;
  notes?: string;
  date?: string;
  time?: string;
  birthYear?: number | null;
  healthConsentAt?: Date | string | null;
  healthConsentVersion?: string | null;
};

export type OrderMembershipPricing = {
  amountOre: number;
  priceTier: PriceTier;
  vfgMemberVerified: boolean;
  verifiedAt: Date | null;
  vfgMemberId?: string | null;
};

export async function resolveOrderMembershipPricing(input: {
  productId: string;
  email?: string | null;
  phone?: string | null;
  membership?: VfgMembershipLookupResult;
  lookup?: VfgMembershipLookup;
}): Promise<{ membership: VfgMembershipLookupResult; pricing: OrderMembershipPricing }> {
  const membership =
    input.membership ??
    (await lookupVfgMembership({ email: input.email, phone: input.phone }, input.lookup));
  const priced = resolveCheckoutPrice({
    productId: input.productId,
    isVfgMember: isActiveVfgMember(membership),
  });
  if (!priced) {
    throw new Error("Ukendt ydelse");
  }
  return {
    membership,
    pricing: {
      amountOre: priced.amountOre,
      priceTier: priced.priceTier,
      vfgMemberVerified: isActiveVfgMember(membership),
      verifiedAt: membership.verifiedAt,
      vfgMemberId: membership.memberId ?? null,
    },
  };
}

export async function createPendingOrder(input: {
  productId: string;
  customer: CheckoutCustomer;
  earlyPerformanceRequested?: boolean;
  membership?: VfgMembershipLookupResult;
  lookup?: VfgMembershipLookup;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL mangler");

  const { pricing } = await resolveOrderMembershipPricing({
    productId: input.productId,
    email: input.customer.email,
    phone: input.customer.phone,
    membership: input.membership,
    lookup: input.lookup,
  });
  const product = getProduct(input.productId);
  if (!product) {
    throw new Error("Ukendt ydelse");
  }
  if (product.bookingType === "session") {
    throw new Error("PT-session kræver en bekræftet booking");
  }

  const vat = calculateVat(
    pricing.amountOre,
    getVatSettings(),
    input.productId,
    input.customer.birthYear
  );
  const email = normalizeCheckoutEmail(input.customer.email);
  const key = packCheckoutIdempotencyKey(email, input.productId);
  const pricingWrite = {
    amountOre: vat.chargeOre,
    vatRegistered: vat.vatApplied,
    vatRatePercent: vat.vatRatePercent,
    vatAmountOre: vat.vatAmountOre,
    vfgMemberVerified: pricing.vfgMemberVerified,
    priceTier: pricing.priceTier,
    chargedAmountOre: pricing.amountOre,
    verifiedAt: pricing.verifiedAt,
    vfgMemberId: pricing.vfgMemberId ?? null,
  };
  const customerWrite = {
    customerName: input.customer.name,
    customerEmail: email,
    customerPhone: input.customer.phone,
    goal: input.customer.goal,
    notes: input.customer.notes ?? null,
    date: input.customer.date ?? null,
    time: input.customer.time ?? null,
    birthYear: input.customer.birthYear ?? null,
    earlyPerformanceRequested: Boolean(input.earlyPerformanceRequested),
    earlyPerformanceRequestedAt: input.earlyPerformanceRequested ? new Date() : null,
    healthConsentAt: input.customer.healthConsentAt
      ? new Date(input.customer.healthConsentAt)
      : null,
    healthConsentVersion: input.customer.healthConsentVersion ?? null,
  };

  const order = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const pending = await tx.order.findMany({
      where: { customerEmail: email, productId: input.productId, status: "pending" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const race = resolvePendingOrderRace(pending);
    for (const extraId of race.cancelIds) {
      await tx.order.update({
        where: { id: extraId },
        data: { status: "cancelled" },
      });
    }
    if (race.keep) {
      return tx.order.update({
        where: { id: race.keep.id },
        data: { ...pricingWrite, ...customerWrite },
      });
    }
    return tx.order.create({
      data: {
        productId: input.productId,
        status: "pending",
        currency: "dkk",
        ...pricingWrite,
        ...customerWrite,
      },
    });
  });

  return { order, bookingId: null as string | null };
}

export async function createPendingOrderForExistingBooking(input: {
  bookingId: string;
  earlyPerformanceRequested?: boolean;
  birthYear?: number | null;
  membership?: VfgMembershipLookupResult;
  lookup?: VfgMembershipLookup;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL mangler");

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { order: true },
  });
  if (!booking) {
    throw new Error("Bookingen blev ikke fundet");
  }

  const payable = evaluateSessionPayment({
    id: booking.id,
    productId: booking.productId,
    status: booking.status,
    date: booking.date,
    time: booking.time,
    holdUntil: booking.holdUntil,
    orderStatus: booking.order?.status ?? null,
  });
  if (!payable.ok) {
    throw new Error(payable.error);
  }

  const { pricing } = await resolveOrderMembershipPricing({
    productId: booking.productId,
    email: booking.email,
    phone: booking.phone,
    membership: input.membership,
    lookup: input.lookup,
  });
  const product = getProduct(booking.productId);
  if (!product || product.id !== "session") {
    throw new Error("Ukendt ydelse");
  }

  const vat = calculateVat(
    pricing.amountOre,
    getVatSettings(),
    booking.productId,
    input.birthYear
  );
  const pricingWrite = {
    amountOre: vat.chargeOre,
    vatRegistered: vat.vatApplied,
    vatRatePercent: vat.vatRatePercent,
    vatAmountOre: vat.vatAmountOre,
    vfgMemberVerified: pricing.vfgMemberVerified,
    priceTier: pricing.priceTier,
    chargedAmountOre: pricing.amountOre,
    verifiedAt: pricing.verifiedAt,
    vfgMemberId: pricing.vfgMemberId ?? null,
  };
  const customerWrite = {
    customerName: booking.name,
    customerEmail: booking.email.toLowerCase(),
    customerPhone: booking.phone,
    goal: booking.goal,
    notes: booking.notes,
    date: booking.date,
    time: booking.time,
    birthYear: input.birthYear ?? null,
    earlyPerformanceRequested: Boolean(input.earlyPerformanceRequested),
    earlyPerformanceRequestedAt: input.earlyPerformanceRequested ? new Date() : null,
    healthConsentAt: booking.healthConsentAt,
    healthConsentVersion: booking.healthConsentVersion,
  };

  const order =
    booking.order?.status === "pending"
      ? await prisma.order.update({
          where: { id: booking.order.id },
          data: { ...pricingWrite, ...customerWrite },
        })
      : await prisma.order.create({
          data: {
            productId: booking.productId,
            status: "pending",
            currency: "dkk",
            ...pricingWrite,
            ...customerWrite,
          },
        });

  const now = new Date();
  const attached = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      OR: [
        { status: BOOKING_STATUS.awaitingPayment },
        { status: BOOKING_STATUS.hold, holdUntil: { lte: now } },
        { status: BOOKING_STATUS.hold, holdUntil: null },
      ],
    },
    data: {
      orderId: order.id,
      status: BOOKING_STATUS.hold,
      holdUntil: holdUntilFromNow(),
    },
  });
  if (attached.count !== 1) {
    if (booking.order?.id !== order.id) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "cancelled" },
      });
    }
    throw new Error("Bookingen kan ikke betales i denne status");
  }

  return { order, bookingId: booking.id };
}

export async function attachStripeSession(orderId: string, stripeCheckoutSessionId: string) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL mangler");
  await prisma.order.update({
    where: { id: orderId },
    data: { stripeCheckoutSessionId },
  });
}

export async function markOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: { stripePaymentIntentId?: string | null }
) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL mangler");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (order.status === status) return order;
  if (!canTransitionOrder(order.status, status)) return order;

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(status === "paid" ? { paidAt: new Date() } : {}),
      ...(extra?.stripePaymentIntentId
        ? { stripePaymentIntentId: extra.stripePaymentIntentId }
        : {}),
    },
  });
}

export async function fulfillPaidOrder(input: {
  orderId: string;
  stripePaymentIntentId?: string | null;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL mangler");

  const existing = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { clipCard: true, bookings: true },
  });
  if (!existing) return { ok: false as const, reason: "missing" };

  const alreadyPaid = existing.status === "paid";
  const updated = alreadyPaid
    ? existing
    : await markOrderStatus(existing.id, "paid", {
        stripePaymentIntentId: input.stripePaymentIntentId,
      });
  if (!updated || updated.status !== "paid") {
    return { ok: false as const, reason: "status" };
  }

  const product = getProduct(existing.productId);
  let remaining: number | null = existing.clipCard?.remaining ?? null;
  let accessToken: string | null = existing.clipCard?.accessToken ?? null;
  let createdCard = false;

  const clipPlan = planClipCardActivation({
    productId: existing.productId,
    alreadyHasCard: Boolean(existing.clipCard),
  });

  if (clipPlan.action === "create") {
    try {
      const card = await prisma.clipCard.create({
        data: {
          orderId: existing.id,
          email: existing.customerEmail,
          name: existing.customerName,
          phone: existing.customerPhone,
          productId: existing.productId,
          totalSessions: clipPlan.totalSessions,
          remaining: clipPlan.remaining,
          status: "active",
          accessToken: randomUUID(),
        },
      });
      remaining = card.remaining;
      accessToken = card.accessToken;
      createdCard = true;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const card = await prisma.clipCard.findUnique({ where: { orderId: existing.id } });
      remaining = card?.remaining ?? remaining;
      accessToken = card?.accessToken ?? accessToken;
    }
  }

  if (product?.bookingType === "session") {
    await prisma.booking.updateMany({
      where: {
        orderId: existing.id,
        status: { in: [BOOKING_STATUS.hold, BOOKING_STATUS.awaitingPayment] },
      },
      data: { status: BOOKING_STATUS.confirmed, holdUntil: null },
    });
  }

  if (!alreadyPaid || createdCard) {
    await sendPaidReceipts({
      orderId: existing.id,
      remaining,
      accessToken,
    });
  }

  return {
    ok: true as const,
    order: updated,
    duplicate: alreadyPaid && !createdCard,
    remaining,
    accessToken,
  };
}

async function sendPaidReceipts(input: {
  orderId: string;
  remaining: number | null;
  accessToken: string | null;
}) {
  const prisma = getPrisma();
  if (!prisma) return;
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { bookings: true, clipCard: true },
  });
  if (!order) return;

  const product = getProduct(order.productId);
  const productName = product?.name ?? order.productId;
  const amount = priceLabel({
    price: order.amountOre / 100,
    tagline: "",
  });
  const siteUrl = getSiteUrl();
  const sessionBooking = order.bookings.find((row) => row.date && row.time);

  const customerLines = [
    `Hej ${order.customerName}`,
    "",
    "Din betaling er bekræftet.",
    "",
    `Ydelse: ${productName}`,
    `Pris: ${amount}`,
    "Betalingsstatus: Betalt",
  ];

  if (sessionBooking?.date && sessionBooking.time) {
    customerLines.push(`Dato: ${formatDate(sessionBooking.date)}`);
    customerLines.push(`Tidspunkt: ${sessionBooking.time}`);
  }

  if (input.remaining != null && order.clipCard) {
    customerLines.push(`Antal træninger: ${order.clipCard.totalSessions}`);
    customerLines.push(`${input.remaining} træninger tilbage`);
    if (input.accessToken) {
      customerLines.push("");
      customerLines.push(`Book en træning: ${siteUrl}/booking?klip=${input.accessToken}`);
    }
  }

  customerLines.push("", "Mvh", "Lukas Møller");

  await trySendCustomerEmail({
    to: order.customerEmail,
    subject: `Bekræftelse: ${productName}`,
    text: customerLines.join("\n"),
  });

  const notifyLines = [
    "Betaling bekræftet (Stripe webhook).",
    "",
    `Ordre: ${order.id}`,
    `Ydelse: ${productName}`,
    `Navn: ${order.customerName}`,
    `Email: ${order.customerEmail}`,
    `Telefon: ${order.customerPhone}`,
    `Beløb: ${amount}`,
    `Stripe session: ${order.stripeCheckoutSessionId ?? "—"}`,
    `Stripe payment: ${order.stripePaymentIntentId ?? "—"}`,
  ];
  if (sessionBooking?.date && sessionBooking.time) {
    notifyLines.push(`Tid: ${sessionBooking.date} ${sessionBooking.time}`);
  }
  if (input.remaining != null) {
    notifyLines.push(`Klip tilbage: ${input.remaining}`);
  }

  await trySendNotification({
    subject: `Betalt ordre: ${order.customerName} · ${productName}`,
    text: notifyLines.join("\n"),
    replyTo: order.customerEmail,
  });
}

export async function failPendingOrder(
  orderId: string,
  stripeCheckoutSessionId?: string | null
) {
  const prisma = getPrisma();
  if (!prisma) return;
  const current = await prisma.order.findUnique({ where: { id: orderId } });
  if (!current) return;
  if (!shouldApplyTerminalSessionToOrder(current, stripeCheckoutSessionId)) return;

  await markOrderStatus(orderId, "failed");
  const held = await prisma.booking.findMany({
    where: { orderId, status: BOOKING_STATUS.hold },
  });
  for (const row of held) {
    const next = bookingStatusAfterCheckoutExpired(row.status);
    await prisma.booking.update({
      where: { id: row.id },
      data: {
        status: next,
        holdUntil: null,
        ...(next === BOOKING_STATUS.cancelled ? { cancelledAt: new Date() } : {}),
      },
    });
  }
}
