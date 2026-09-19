import { NextRequest, NextResponse } from "next/server";
import { hasVfgMemberPrice } from "@/lib/checkout-price";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { honeypotFilled, isValidEmail, readString } from "@/lib/validation";
import {
  lookupVfgMembership,
  membershipPreviewStatus,
  vfgPricePreviewMessage,
} from "@/lib/vfg-membership";

function genericPreview() {
  return {
    ok: true as const,
    preview: "unverified" as const,
    message: vfgPricePreviewMessage("unverified"),
  };
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`vfg-membership:${getClientKey(request)}`);
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
    return NextResponse.json(genericPreview());
  }

  void body.isMember;
  void body.isVfgMember;
  void body.amount;
  void body.priceTier;

  const email = readString(body, "email").trim();
  const phone = readString(body, "phone").trim();
  const productId = readString(body, "productId").trim();

  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }
  if (!email && !phone) {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }
  if (productId && !hasVfgMemberPrice(productId)) {
    return NextResponse.json(genericPreview());
  }

  try {
    const membership = await lookupVfgMembership({ email, phone });
    const preview = membershipPreviewStatus(membership);
    return NextResponse.json({
      ok: true,
      preview,
      message: vfgPricePreviewMessage(preview),
    });
  } catch {
    return NextResponse.json(genericPreview());
  }
}
