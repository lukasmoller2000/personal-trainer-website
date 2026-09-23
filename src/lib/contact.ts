import { persistContactMessage } from "@/lib/db";
import { healthConsentEmailLine } from "@/lib/health-consent";
import { sendNotification } from "@/lib/mail";

export { contactFormShowsSuccess } from "@/lib/contact-ui";

export async function deliverContactMessage(
  input: {
    name: string;
    email: string;
    phone: string;
    message: string;
    healthConsentAt?: Date | string | null;
    healthConsentVersion?: string | null;
  },
  deps?: {
    send?: (options: { subject: string; text: string; replyTo?: string }) => Promise<void>;
    persist?: typeof persistContactMessage;
  }
) {
  const send = deps?.send ?? sendNotification;
  const persist = deps?.persist ?? persistContactMessage;

  await send({
    subject: `Ny besked fra ${input.name}`,
    text: [
      "Ny besked fra kontaktformularen.",
      "",
      `Navn: ${input.name}`,
      `Email: ${input.email}`,
      `Telefon: ${input.phone}`,
      "",
      "Besked:",
      input.message,
      ...(healthConsentEmailLine(input) ? ["", healthConsentEmailLine(input) as string] : []),
    ].join("\n"),
    replyTo: input.email,
  });

  try {
    await persist(input);
  } catch (error) {
    console.error(
      "Kontakt-email blev sendt, men kunne ikke gemmes i databasen",
      error instanceof Error ? error.name : "unknown"
    );
  }
}
