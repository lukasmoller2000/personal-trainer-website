import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminConfigured, isValidAdminCookie } from "@/lib/admin-auth";
import { BookingAdminError, decideSessionBooking } from "@/lib/booking-admin";
import { readString } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  const jar = await cookies();
  if (!isValidAdminCookie(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  const bookingId = readString(body, "bookingId").trim();
  const action = readString(body, "action").trim();
  if (!bookingId) {
    return NextResponse.json({ error: "Booking mangler" }, { status: 400 });
  }
  if (action !== "confirm" && action !== "reject" && action !== "resend") {
    return NextResponse.json({ error: "Ukendt handling" }, { status: 400 });
  }

  try {
    const result = await decideSessionBooking({ bookingId, action });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BookingAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin booking-handling fejlede", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Kunne ikke opdatere bookingen" }, { status: 500 });
  }
}
