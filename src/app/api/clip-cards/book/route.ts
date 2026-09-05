import { NextRequest, NextResponse } from "next/server";
import { getSlotsForDate, isBookableDate } from "@/lib/availability";
import { ClipConsumeError, consumeClipAtomically } from "@/lib/clip-cards";
import { isClipCardExpired } from "@/lib/commerce";
import { getTakenTimes, getPrisma } from "@/lib/db";
import { trySendCustomerEmail, trySendNotification } from "@/lib/mail";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { formatDate } from "@/lib/utils";
import {
  honeypotFilled,
  isClockTime,
  isIsoDate,
  readString,
} from "@/lib/validation";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (token.length < 8) {
    return NextResponse.json({ error: "Ugyldigt klippekort" }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Klippekortet blev ikke fundet" }, { status: 404 });
  }

  const card = await prisma.clipCard.findUnique({
    where: { accessToken: token },
    select: {
      remaining: true,
      totalSessions: true,
      status: true,
      name: true,
      productId: true,
      createdAt: true,
    },
  });

  if (!card || card.status === "cancelled" || isClipCardExpired(card.createdAt)) {
    return NextResponse.json({ error: "Klippekortet blev ikke fundet" }, { status: 404 });
  }

  return NextResponse.json({
    remaining: card.remaining,
    totalSessions: card.totalSessions,
    status: card.status,
    name: card.name,
    productId: card.productId,
  });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`clip-book:${getClientKey(request)}`);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "For mange forsøg. Vent et øjeblik, og prøv igen." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  if (honeypotFilled(body.website)) {
    return NextResponse.json({ ok: true });
  }

  const token = readString(body, "token").trim();
  const date = readString(body, "date").trim();
  const time = readString(body, "time").trim();
  const notes = readString(body, "notes");

  if (token.length < 8) {
    return NextResponse.json({ error: "Ugyldigt klippekort" }, { status: 400 });
  }
  if (!isIsoDate(date) || !isClockTime(time)) {
    return NextResponse.json(
      { error: "Vælg dato og tidspunkt for din træning" },
      { status: 400 }
    );
  }
  if (notes.trim().length > 2000) {
    return NextResponse.json({ error: "Bemærkningen er for lang" }, { status: 400 });
  }

  const parsed = new Date(`${date}T12:00:00`);
  if (!isBookableDate(parsed) || !getSlotsForDate(parsed).includes(time)) {
    return NextResponse.json({ error: "Tidspunktet er ikke ledigt" }, { status: 400 });
  }

  const taken = await getTakenTimes(date);
  if (taken.includes(time)) {
    return NextResponse.json({ error: "Tidspunktet er ikke ledigt" }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: "Klippekortet blev ikke fundet" }, { status: 404 });
  }

  const card = await prisma.clipCard.findUnique({ where: { accessToken: token } });
  if (!card || isClipCardExpired(card.createdAt)) {
    return NextResponse.json({ error: "Klippekortet blev ikke fundet" }, { status: 404 });
  }

  try {
    const result = await consumeClipAtomically({
      clipCardId: card.id,
      booking: {
        productId: "session",
        date,
        time,
        name: card.name,
        email: card.email,
        phone: card.phone,
        goal: "Klippekort",
        notes: notes.trim() || undefined,
      },
    });

    await trySendCustomerEmail({
      to: card.email,
      subject: "Din træning er booket",
      text: [
        `Hej ${card.name}`,
        "",
        `Dato: ${formatDate(date)}`,
        `Tidspunkt: ${time}`,
        `${result.remaining} træninger tilbage.`,
        "",
        "Mvh",
        "Lukas Møller",
      ].join("\n"),
    });

    await trySendNotification({
      subject: `Klippekort-booking: ${card.name} · ${date} ${time}`,
      text: [
        "Ny booking med klippekort.",
        "",
        `Navn: ${card.name}`,
        `Email: ${card.email}`,
        `Telefon: ${card.phone}`,
        `Dato: ${formatDate(date)}`,
        `Tid: ${time}`,
        `Klip tilbage: ${result.remaining}`,
      ].join("\n"),
      replyTo: card.email,
    });

    return NextResponse.json({
      booking: result.booking,
      remaining: result.remaining,
      totalSessions: result.totalSessions,
    });
  } catch (error) {
    if (error instanceof ClipConsumeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Klip-booking fejlede", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Kunne ikke booke. Prøv igen." }, { status: 500 });
  }
}
