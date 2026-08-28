import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminCookieValue,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { honeypotFilled, readString } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  const limited = rateLimit(`admin-login:${getClientKey(request)}`);
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

  const password = readString(body, "password");
  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Forkert adgangskode" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
