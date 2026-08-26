import { Resend } from "resend";
import { siteConfig } from "@/lib/utils";
import { isValidEmail } from "@/lib/validation";

export { isValidEmail };

export class MailNotConfiguredError extends Error {
  constructor() {
    super("Email er ikke konfigureret");
    this.name = "MailNotConfiguredError";
  }
}

export class MailSendError extends Error {
  constructor() {
    super("Kunne ikke sende e-mail");
    this.name = "MailSendError";
  }
}

export function formUnavailableMessage() {
  return `Formularen er midlertidigt ude af drift. Skriv direkte til ${siteConfig.links.email}.`;
}

export function getNotifyEmail() {
  const fromEnv = process.env.BOOKINGS_NOTIFY_EMAIL?.trim();
  if (fromEnv && isValidEmail(fromEnv)) return fromEnv;
  return siteConfig.links.email;
}

export function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Lukas Møller <beth.t@example.com>";
}

function getClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new MailNotConfiguredError();
  }
  return new Resend(apiKey);
}

export async function sendNotification(options: {
  subject: string;
  text: string;
  replyTo?: string;
}) {
  const resend = getClient();

  try {
    const { error } = await resend.emails.send({
      from: getFromEmail(),
      to: getNotifyEmail(),
      subject: options.subject,
      text: options.text,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });

    if (error) {
      console.error("Resend afviste e-mailen", error);
      throw new MailSendError();
    }
  } catch (error) {
    if (error instanceof MailNotConfiguredError || error instanceof MailSendError) {
      throw error;
    }
    console.error("Kunne ikke sende e-mail", error);
    throw new MailSendError();
  }
}
