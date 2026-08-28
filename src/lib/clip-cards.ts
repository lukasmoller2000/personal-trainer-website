import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import {
  canConsumeClip,
  canRefundUnusedClipCard,
  clipStatusAfterConsume,
  isUniqueConstraintError,
  remainingAfterConsume,
} from "@/lib/commerce";
import { getPrisma } from "@/lib/db";

export { canConsumeClip, canRefundUnusedClipCard, remainingAfterConsume, clipStatusAfterConsume };

export async function consumeClipAtomically(input: {
  clipCardId: string;
  booking: {
    id?: string;
    productId: string;
    date: string;
    time: string;
    name: string;
    email: string;
    phone: string;
    goal: string;
    notes?: string;
  };
}) {
  const prisma = getPrisma();
  if (!prisma) {
    throw new Error("DATABASE_URL mangler");
  }

  return prisma.$transaction(async (tx) => {
    const card = await tx.clipCard.findUnique({ where: { id: input.clipCardId } });
    const check = canConsumeClip(card);
    if (!check.ok || !card) {
      throw new ClipConsumeError(check.ok ? "Ingen træninger tilbage" : check.error);
    }

    const remaining = remainingAfterConsume(card.remaining);
    const updated = await tx.clipCard.updateMany({
      where: { id: card.id, remaining: card.remaining, status: "active" },
      data: {
        remaining,
        status: clipStatusAfterConsume(remaining),
      },
    });

    if (updated.count !== 1) {
      throw new ClipConsumeError("Klippet kunne ikke trækkes. Prøv igen.");
    }

    const booking = await tx.booking.create({
      data: {
        id: input.booking.id ?? randomUUID(),
        productId: input.booking.productId,
        type: "session",
        date: input.booking.date,
        time: input.booking.time,
        name: input.booking.name,
        email: input.booking.email,
        phone: input.booking.phone,
        goal: input.booking.goal,
        notes: input.booking.notes ?? null,
        status: "confirmed",
        clipCardId: card.id,
        orderId: card.orderId,
      },
    });

    return { booking, remaining, totalSessions: card.totalSessions };
  });
}

export class ClipConsumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClipConsumeError";
  }
}

export async function refundUnusedClipCard(orderId: string, prisma?: PrismaClient) {
  const client = prisma ?? getPrisma();
  if (!client) throw new Error("DATABASE_URL mangler");

  return client.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { clipCard: true },
    });
    if (!order) throw new ClipConsumeError("Ordren blev ikke fundet");
    if (order.status !== "paid") {
      throw new ClipConsumeError("Kun betalte ordrer kan refunderes");
    }

    const check = canRefundUnusedClipCard(order.clipCard);
    if (!check.ok) {
      throw new ClipConsumeError(check.error);
    }

    if (order.clipCard) {
      await tx.clipCard.update({
        where: { id: order.clipCard.id },
        data: { remaining: 0, status: "cancelled" },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "refunded" },
    });

    return { ok: true as const };
  });
}

export async function claimStripeEvent(id: string, type: string) {
  const prisma = getPrisma();
  if (!prisma) return "skipped" as const;

  try {
    await prisma.stripeEvent.create({ data: { id, type } });
    return "new" as const;
  } catch (error) {
    if (isUniqueConstraintError(error)) return "duplicate" as const;
    throw error;
  }
}
