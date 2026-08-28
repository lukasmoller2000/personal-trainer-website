import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { isMailConfigured, trySendCustomerEmail } from "@/lib/mail";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/utils";
import { honeypotFilled, isValidEmail, readString } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`clip-lookup:${getClientKey(request)}`);
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

  const email = readString(body, "email").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Ugyldig email" }, { status: 400 });
  }

  const generic = {
    ok: true,
    message:
      "Hvis der er et aktivt klippekort på denne mail, sender vi et link til at booke.",
  };

  const prisma = getPrisma();
  if (!prisma || !isMailConfigured()) {
    return NextResponse.json(generic);
  }

  const card = await prisma.clipCard.findFirst({
    where: { email, status: "active", remaining: { gt: 0 } },
    orderBy: { createdAt: "desc" },
  });

  if (card) {
    const siteUrl = getSiteUrl();
    await trySendCustomerEmail({
      to: email,
      subject: "Book din næste træning",
      text: [
        `Hej ${card.name}`,
        "",
        `${card.remaining} træninger tilbage.`,
        "",
        `Book her: ${siteUrl}/booking?klip=${card.accessToken}`,
        "",
        "Mvh",
        "Lukas Møller",
      ].join("\n"),
    });
  }

  return NextResponse.json(generic);
}
