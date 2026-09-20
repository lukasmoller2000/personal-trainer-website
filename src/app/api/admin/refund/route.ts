import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminConfigured, isValidAdminCookie } from "@/lib/admin-auth";
import { RefundError, refundPaidOrderFromAdmin } from "@/lib/refund";
import { readString } from "@/lib/validation";

function sameOrigin(request: NextRequest) {
  const expected = request.nextUrl.origin;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === expected;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (!referer) return true;
  try {
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  const jar = await cookies();
  if (!isValidAdminCookie(jar.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  }

  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 403 });
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
    const result = await refundPaidOrderFromAdmin(orderId, {
      amount: body.amount ?? body.amountOre ?? body.chargedAmountOre,
      paymentIntent: body.paymentIntent ?? body.stripePaymentIntentId,
      stripeAccount: body.stripeAccount,
    });
    return NextResponse.json({
      ok: true,
      status: result.status,
      alreadyRefunded: result.alreadyRefunded,
      refundId: result.refundId,
      amountOre: result.amountOre,
    });
  } catch (error) {
    if (error instanceof RefundError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Refund fejlede", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Kunne ikke refundere" }, { status: 500 });
  }
}
