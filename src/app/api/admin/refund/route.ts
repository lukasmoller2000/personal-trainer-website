import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminConfigured, isValidAdminCookie } from "@/lib/admin-auth";
import { ClipConsumeError, refundUnusedClipCard } from "@/lib/clip-cards";
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

  const orderId = readString(body, "orderId").trim();
  if (!orderId) {
    return NextResponse.json({ error: "Ordre mangler" }, { status: 400 });
  }

  try {
    await refundUnusedClipCard(orderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ClipConsumeError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Refund fejlede", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Kunne ikke refundere" }, { status: 500 });
  }
}
