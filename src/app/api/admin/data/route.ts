import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminConfigured, isValidAdminCookie } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/db";

export async function GET() {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  const jar = await cookies();
  if (!isValidAdminCookie(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ bookings: [], orders: [], clipCards: [] });
  }

  const [bookings, orders, clipCards] = await Promise.all([
    prisma.booking.findMany({
      orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.clipCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return NextResponse.json({
    bookings: bookings.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      productId: row.productId,
      date: row.date,
      time: row.time,
      status: row.status,
      goal: row.goal,
      createdAt: row.createdAt,
      orderId: row.orderId,
    })),
    orders: orders.map((row) => ({
      id: row.id,
      productId: row.productId,
      status: row.status,
      amountOre: row.amountOre,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      stripeCheckoutSessionId: row.stripeCheckoutSessionId,
      stripePaymentIntentId: row.stripePaymentIntentId,
      date: row.date,
      time: row.time,
      createdAt: row.createdAt,
    })),
    clipCards: clipCards.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      remaining: row.remaining,
      totalSessions: row.totalSessions,
      status: row.status,
      orderId: row.orderId,
    })),
  });
}
