import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getProduct } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { isFilled } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim() ?? "";
  if (!isFilled(sessionId, 200, 8)) {
    return NextResponse.json({ error: "Session mangler" }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ status: "unknown" });
  }

  const order = await prisma.order.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: { bookings: true, clipCard: true },
  });

  if (!order) {
    return NextResponse.json({ status: "pending" });
  }

  const product = getProduct(order.productId);
  const sessionBooking = order.bookings.find((row) => row.date && row.time);

  return NextResponse.json({
    status: order.status,
    productName: product?.name ?? order.productId,
    productId: order.productId,
    amountLabel: formatPrice(order.amountOre / 100),
    date: sessionBooking?.date ?? order.date,
    time: sessionBooking?.time ?? order.time,
    remaining: order.clipCard?.remaining ?? null,
    totalSessions: order.clipCard?.totalSessions ?? product?.sessions ?? null,
    accessToken: order.status === "paid" ? order.clipCard?.accessToken ?? null : null,
    paid: order.status === "paid",
  });
}
