import { NextRequest, NextResponse } from "next/server";
import { MailNotConfiguredError, isValidEmail, sendNotification } from "@/lib/mail";
import { siteConfig } from "@/lib/utils";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !phone || !message) {
    return NextResponse.json({ error: "Udfyld alle påkrævede felter" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Ugyldig email" }, { status: 400 });
  }

  try {
    await sendNotification({
      subject: `Ny besked fra ${name}`,
      text: [
        "Ny besked fra kontaktformularen.",
        "",
        `Navn: ${name}`,
        `Email: ${email}`,
        `Telefon: ${phone}`,
        "",
        "Besked:",
        message,
      ].join("\n"),
      replyTo: email,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MailNotConfiguredError) {
      return NextResponse.json(
        {
          error: `Formularen er midlertidigt ude af drift. Skriv direkte til ${siteConfig.links.email}.`,
        },
        { status: 503 }
      );
    }
    const errorMessage = error instanceof Error ? error.message : "Kunne ikke sende";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
