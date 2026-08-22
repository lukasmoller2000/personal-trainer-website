import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { BookingType } from "@/lib/products";

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

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "bookings.json");

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]", "utf8");
  }
}

export async function readBookings(): Promise<Booking[]> {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf8");
  return JSON.parse(raw) as Booking[];
}

export async function getBookedTimes(date: string) {
  const bookings = await readBookings();
  return bookings
    .filter((booking) => booking.type !== "inquiry" && booking.date === date && booking.time)
    .map((booking) => booking.time as string);
}

export async function createBooking(
  input: Omit<Booking, "id" | "createdAt">
): Promise<Booking> {
  const bookings = await readBookings();

  if (input.date && input.time) {
    const taken = bookings.some(
      (booking) =>
        booking.type !== "inquiry" &&
        booking.date === input.date &&
        booking.time === input.time
    );

    if (taken) {
      throw new Error("Tiden er allerede booket");
    }
  }

  const booking: Booking = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  await fs.writeFile(dataFile, JSON.stringify(bookings, null, 2), "utf8");
  return booking;
}
