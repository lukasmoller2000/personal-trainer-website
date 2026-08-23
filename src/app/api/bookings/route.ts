import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/bookings";
import { MailNotConfiguredError, isValidEmail } from "@/lib/mail";
import { getProduct, requiresTimeslot } from "@/lib/products";
import { getSlotsForDate, isBookableDate } from "@/lib/availability";
import { siteConfig } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "Dato mangler" }, { status: 400 });
  }

  return NextResponse.json({ times: [] });
}

export async function POST(request: NextRequest) {
  let body: Record<string, string | undefined>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  const { productId, date, time, name, email, phone, goal, notes } = body;

  if (!productId || !name?.trim() || !email?.trim() || !phone?.trim() || !goal?.trim()) {
    return NextResponse.json({ error: "Udfyld alle påkrævede felter" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Ugyldig email" }, { status: 400 });
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
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      goal: goal.trim(),
      notes: notes?.trim() || undefined,
      ...(needsTimeslot ? { date, time } : {}),
    });
    return NextResponse.json({ booking });
  } catch (error) {
    if (error instanceof MailNotConfiguredError) {
      return NextResponse.json(
        {
          error: `Formularen er midlertidigt ude af drift. Skriv direkte til ${siteConfig.links.email}.`,
        },
        { status: 503 }
      );
    }
    const message = error instanceof Error ? error.message : "Kunne ikke sende booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
