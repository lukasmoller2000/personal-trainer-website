import { randomUUID } from "crypto";
import type { BookingType } from "@/lib/products";
import { getProduct } from "@/lib/products";
import { persistBooking } from "@/lib/db";
import { sendNotification } from "@/lib/mail";
import { formatDate } from "@/lib/utils";

export type Booking = {
  id: string;
  productId: string;
  type: BookingType;
  date?: string;
  time?: string;
  name: string;
  email: string;
  phone: string;
  goal: string;
  notes?: string;
  createdAt: string;
};

export async function createBooking(
  input: Omit<Booking, "id" | "createdAt">
): Promise<Booking> {
  const booking: Booking = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const product = getProduct(input.productId);
  const productName = product?.name ?? input.productId;
  const isInquiry = input.type === "inquiry";

  const lines = [
    isInquiry
      ? "Ny forespørgsel om online coaching."
      : "Ny forespørgsel om personlig træning.",
    "",
    `Ydelse: ${productName}`,
    `Navn: ${input.name}`,
    `Email: ${input.email}`,
    `Telefon: ${input.phone}`,
    `Mål: ${input.goal}`,
  ];

  if (input.date && input.time) {
    lines.push(`Ønsket dato: ${formatDate(input.date)}`);
    lines.push(`Ønsket tidspunkt: ${input.time}`);
    lines.push("");
    lines.push(
      "OBS: Tiden er IKKE reserveret automatisk. Bekræft tidspunktet med kunden."
    );
  }

  if (input.notes) {
    lines.push("", `Bemærkninger: ${input.notes}`);
  }

  await sendNotification({
    subject: isInquiry
      ? `Ny online coaching-forespørgsel: ${input.name}`
      : `Ny PT-forespørgsel: ${input.name}${
          input.date && input.time ? ` · ${input.date} ${input.time}` : ""
        }`,
    text: lines.join("\n"),
    replyTo: input.email,
  });

  try {
    await persistBooking(booking);
  } catch (error) {
    console.error("Booking-email blev sendt, men kunne ikke gemmes i databasen", error);
  }

  return booking;
}
