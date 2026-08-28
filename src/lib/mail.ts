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

export function isMailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
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

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}) {
  const resend = getClient();

  try {
    const { error } = await resend.emails.send({
      from: getFromEmail(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });

    if (error) {
      console.error("Resend afviste e-mailen");
      throw new MailSendError();
    }
  } catch (error) {
    if (error instanceof MailNotConfiguredError || error instanceof MailSendError) {
      throw error;
    }
    console.error("Kunne ikke sende e-mail");
    throw new MailSendError();
  }
}

export async function sendNotification(options: {
  subject: string;
  text: string;
  replyTo?: string;
}) {
  await sendMail({
    to: getNotifyEmail(),
    subject: options.subject,
    text: options.text,
    replyTo: options.replyTo,
  });
}

export async function trySendCustomerEmail(options: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!isMailConfigured() || !isValidEmail(options.to)) return;
  try {
    await sendMail(options);
  } catch (error) {
    console.error("Kunde-mail kunne ikke sendes", error instanceof Error ? error.name : "unknown");
  }
}

export async function trySendNotification(options: {
  subject: string;
  text: string;
  replyTo?: string;
}) {
  if (!isMailConfigured()) return;
  try {
    await sendNotification(options);
  } catch (error) {
    console.error(
      "Notifikation kunne ikke sendes",
      error instanceof Error ? error.name : "unknown"
    );
  }
}
