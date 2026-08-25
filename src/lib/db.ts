import { PrismaClient } from "@prisma/client";

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

export async function persistBooking(booking: {
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
}) {
  const prisma = getPrisma();
  if (!prisma) return;

  await prisma.booking.create({
    data: {
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
    },
  });
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

  const rows = await prisma.booking.findMany({
    where: { date, time: { not: null } },
    select: { time: true },
  });

  return rows.flatMap((row) => (row.time ? [row.time] : []));
}
