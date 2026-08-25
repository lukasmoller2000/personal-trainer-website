import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/bookings";
import { getTakenTimes } from "@/lib/db";
import { MailNotConfiguredError } from "@/lib/mail";
import { getProduct, requiresTimeslot } from "@/lib/products";
import { getSlotsForDate, isBookableDate } from "@/lib/availability";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/utils";
import {
  honeypotFilled,
  isClockTime,
  isFilled,
  isIsoDate,
  isValidEmail,
  isValidPhone,
  readString,
} from "@/lib/validation";

function limited(request: NextRequest) {
  const result = rateLimit(`bookings:${getClientKey(request)}`);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "For mange forsøg. Vent et øjeblik, og prøv igen." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !isIsoDate(date)) {
    return NextResponse.json({ error: "Dato mangler" }, { status: 400 });
  }

  try {
    const times = await getTakenTimes(date);
    return NextResponse.json({ times });
  } catch (error) {
    console.error("Kunne ikke hente optagne tider", error);
    return NextResponse.json({ times: [] });
  }
}

export async function POST(request: NextRequest) {
  const blocked = limited(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  if (honeypotFilled(body.website)) {
    return NextResponse.json({ ok: true });
  }

  const productId = readString(body, "productId").trim();
  const date = readString(body, "date").trim();
  const time = readString(body, "time").trim();
  const name = readString(body, "name");
  const email = readString(body, "email");
  const phone = readString(body, "phone");
  const goal = readString(body, "goal");
  const notes = readString(body, "notes");

  if (!productId || !isFilled(name, 80) || !isFilled(goal, 200)) {
    return NextResponse.json({ error: "Udfyld alle påkrævede felter" }, { status: 400 });
  }

  if (!isValidEmail(email.trim())) {
    return NextResponse.json({ error: "Ugyldig email" }, { status: 400 });
  }

  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "Ugyldigt telefonnummer" }, { status: 400 });
  }

  if (notes.trim().length > 2000) {
    return NextResponse.json({ error: "Bemærkningen er for lang" }, { status: 400 });
  }

  const product = getProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Ukendt ydelse" }, { status: 400 });
  }

  const needsTimeslot = requiresTimeslot(product);

  if (needsTimeslot) {
    if (!isIsoDate(date) || !isClockTime(time)) {
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
      notes: notes.trim() || undefined,
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
