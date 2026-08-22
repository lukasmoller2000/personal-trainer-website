import { NextRequest, NextResponse } from "next/server";
import { createBooking, getBookedTimes } from "@/lib/bookings";
import { getProduct, requiresTimeslot } from "@/lib/products";
import { getSlotsForDate, isBookableDate } from "@/lib/availability";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Dato mangler" }, { status: 400 });
  }

  const times = await getBookedTimes(date);
  return NextResponse.json({ times });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productId, date, time, name, email, phone, goal, notes } = body as Record<
    string,
    string | undefined
  >;

  if (!productId || !name || !email || !phone || !goal) {
    return NextResponse.json({ error: "Udfyld alle påkrævede felter" }, { status: 400 });
  }

  const product = getProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Ukendt ydelse" }, { status: 400 });
  }

  const needsTimeslot = requiresTimeslot(product);

  if (needsTimeslot) {
    if (!date || !time) {
      return NextResponse.json(
        { error: "Vælg dato og tidspunkt for din træning" },
        { status: 400 }
      );
    }

    const parsed = new Date(`${date}T12:00:00`);
    if (!isBookableDate(parsed) || !getSlotsForDate(parsed).includes(time)) {
      return NextResponse.json({ error: "Tidspunktet er ikke ledigt" }, { status: 400 });
    }
  }

  try {
    const booking = await createBooking({
      productId,
      type: product.bookingType,
      name,
      email,
      phone,
      goal,
      notes,
      ...(needsTimeslot ? { date, time } : {}),
    });
    return NextResponse.json({ booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kunne ikke booke";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
