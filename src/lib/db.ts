import { PrismaClient } from "@prisma/client";
import { checkoutHoldMinutes } from "@/lib/commerce";
import { isProductionRuntime } from "@/lib/utils";

export type BookingPersistenceTarget = "prisma" | "none";

export type BookingWriteClient = {
  booking: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

export class BookingPersistenceError extends Error {
  constructor(message = "Booking kunne ikke gemmes") {
    super(message);
    this.name = "BookingPersistenceError";
  }
}

/** Production always uses Prisma. Dev/test may skip when DATABASE_URL is unset. Never a local file. */
export function bookingPersistenceTarget(): BookingPersistenceTarget {
  if (isProductionRuntime()) return "prisma";
  return isDatabaseConfigured() ? "prisma" : "none";
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrisma(): PrismaClient | null {
  if (!isDatabaseConfigured()) return null;
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

export async function persistBooking(
  booking: {
    id: string;
    productId: string;
    type: string;
    date?: string;
    time?: string;
    name: string;
    email: string;
    phone: string;
    goal: string;
    notes?: string;
    createdAt: string;
    status?: string;
    orderId?: string;
    clipCardId?: string;
    holdUntil?: Date | null;
  },
  client?: BookingWriteClient | null
) {
  const target = bookingPersistenceTarget();
  if (target === "none") {
    return { persisted: false as const, target };
  }

  const prisma = client === undefined ? getPrisma() : client;
  if (!prisma) {
    throw new BookingPersistenceError("DATABASE_URL mangler");
  }

  const data = {
    id: booking.id,
    productId: booking.productId,
    type: booking.type,
    date: booking.date ?? null,
    time: booking.time ?? null,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    goal: booking.goal,
    notes: booking.notes ?? null,
    createdAt: new Date(booking.createdAt),
    status: booking.status ?? "inquiry",
    orderId: booking.orderId ?? null,
    clipCardId: booking.clipCardId ?? null,
    holdUntil: booking.holdUntil ?? null,
  };
  await (prisma as BookingWriteClient).booking.create({ data });

  return { persisted: true as const, target: "prisma" as const };
}

export async function persistContactMessage(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
}) {
  const prisma = getPrisma();
  if (!prisma) return;

  await prisma.contactMessage.create({ data: input });
}

export async function getTakenTimes(date: string): Promise<string[]> {
  const prisma = getPrisma();
  if (!prisma) return [];

  const now = new Date();
  const rows = await prisma.booking.findMany({
    where: {
      date,
      time: { not: null },
      OR: [
        { status: { in: ["inquiry", "confirmed"] } },
        { status: "hold", holdUntil: { gt: now } },
      ],
    },
    select: { time: true },
  });

  return rows.flatMap((row) => (row.time ? [row.time] : []));
}

export function holdUntilFromNow(minutes = checkoutHoldMinutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
