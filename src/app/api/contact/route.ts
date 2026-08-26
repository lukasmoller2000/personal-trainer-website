import { NextRequest, NextResponse } from "next/server";
import { persistContactMessage } from "@/lib/db";
import {
  formUnavailableMessage,
  MailNotConfiguredError,
  MailSendError,
  sendNotification,
} from "@/lib/mail";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import {
  honeypotFilled,
  isFilled,
  isValidEmail,
  isValidPhone,
  readString,
} from "@/lib/validation";

export async function POST(request: NextRequest) {
  const limited = rateLimit(`contact:${getClientKey(request)}`);
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

  const name = readString(body, "name");
  const email = readString(body, "email");
  const phone = readString(body, "phone");
  const message = readString(body, "message");

  if (!isFilled(name, 80) || !isFilled(message, 2000)) {
    return NextResponse.json({ error: "Udfyld alle påkrævede felter" }, { status: 400 });
  }

  if (!isValidEmail(email.trim())) {
    return NextResponse.json({ error: "Ugyldig email" }, { status: 400 });
  }

  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "Ugyldigt telefonnummer" }, { status: 400 });
  }

  try {
    await sendNotification({
      subject: `Ny besked fra ${name.trim()}`,
      text: [
        "Ny besked fra kontaktformularen.",
        "",
        `Navn: ${name.trim()}`,
        `Email: ${email.trim()}`,
        `Telefon: ${phone.trim()}`,
        "",
        "Besked:",
        message.trim(),
      ].join("\n"),
      replyTo: email.trim(),
    });
  } catch (error) {
    if (error instanceof MailNotConfiguredError) {
      return NextResponse.json({ error: formUnavailableMessage() }, { status: 503 });
    }
    if (error instanceof MailSendError) {
      return NextResponse.json({ error: formUnavailableMessage() }, { status: 502 });
    }
    console.error("Kunne ikke sende kontaktbesked", error);
    return NextResponse.json(
      { error: "Kunne ikke sende. Prøv igen, eller skriv direkte." },
      { status: 500 }
    );
  }

  try {
    await persistContactMessage({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      message: message.trim(),
    });
  } catch (error) {
    console.error("Kontakt-email blev sendt, men kunne ikke gemmes i databasen", error);
  }

  return NextResponse.json({ ok: true });
}
