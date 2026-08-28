import { randomUUID } from "crypto";
import {
  calculateVat,
  canTransitionOrder,
  getVatSettings,
  isUniqueConstraintError,
  type OrderStatus,
} from "@/lib/commerce";
import { getPrisma, holdUntilFromNow } from "@/lib/db";
import { trySendCustomerEmail, trySendNotification } from "@/lib/mail";
import { getCheckoutAmountOre, getProduct } from "@/lib/products";
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
};

export async function createPendingOrder(input: {
  productId: string;
  customer: CheckoutCustomer;
}) {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL mangler");

  const amountOre = getCheckoutAmountOre(input.productId);
  const product = getProduct(input.productId);
  if (amountOre == null || !product) {
    throw new Error("Ukendt ydelse");
  }

  const vat = calculateVat(
    amountOre,
    getVatSettings(),
    input.productId,
    input.customer.birthYear
  );

  const order = await prisma.order.create({
    data: {
      productId: input.productId,
      status: "pending",
      amountOre: vat.chargeOre,
      currency: "dkk",
      vatRegistered: vat.vatApplied,
      vatRatePercent: vat.vatRatePercent,
      vatAmountOre: vat.vatAmountOre,
      customerName: input.customer.name,
      customerEmail: input.customer.email.toLowerCase(),
      customerPhone: input.customer.phone,
      goal: input.customer.goal,
      notes: input.customer.notes ?? null,
      date: input.customer.date ?? null,
      time: input.customer.time ?? null,
      birthYear: input.customer.birthYear ?? null,
    },
  });

  if (product.bookingType === "session" && input.customer.date && input.customer.time) {
    await prisma.booking.create({
      data: {
        id: randomUUID(),
        productId: input.productId,
        type: "session",
        date: input.customer.date,
        time: input.customer.time,
        name: input.customer.name,
        email: input.customer.email.toLowerCase(),
        phone: input.customer.phone,
        goal: input.customer.goal,
        notes: input.customer.notes ?? null,
        status: "hold",
        holdUntil: holdUntilFromNow(),
        orderId: order.id,
      },
    });
  }

  return order;
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

  if (product?.bookingType === "pack" && !existing.clipCard) {
    try {
      const card = await prisma.clipCard.create({
        data: {
          orderId: existing.id,
          email: existing.customerEmail,
          name: existing.customerName,
          phone: existing.customerPhone,
          productId: existing.productId,
          totalSessions: product.sessions,
          remaining: product.sessions,
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
      where: { orderId: existing.id, status: "hold" },
      data: { status: "confirmed", holdUntil: null },
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

export async function failPendingOrder(orderId: string) {
  await markOrderStatus(orderId, "failed");
  const prisma = getPrisma();
  if (!prisma) return;
  await prisma.booking.updateMany({
    where: { orderId, status: "hold" },
    data: { status: "cancelled", cancelledAt: new Date(), holdUntil: null },
  });
}
