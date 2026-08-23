import { Resend } from "resend";
import { siteConfig } from "@/lib/utils";

export class MailNotConfiguredError extends Error {
  constructor() {
    super("Email er ikke konfigureret");
    this.name = "MailNotConfiguredError";
  }
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getNotifyEmail() {
  return process.env.BOOKINGS_NOTIFY_EMAIL?.trim() || siteConfig.links.email;
}

export function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Lukas Møller <beth.t@example.com>";
}

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
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
  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: getNotifyEmail(),
    subject: options.subject,
    text: options.text,
    ...(options.replyTo ? { replyTo: options.replyTo } : {}),
  });

  if (error) {
    throw new Error(error.message);
  }
}
