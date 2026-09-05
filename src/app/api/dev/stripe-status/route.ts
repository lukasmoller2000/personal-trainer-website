import { NextResponse } from "next/server";
import { isPaymentsEnabledByFlag, isPaymentsReady } from "@/lib/commerce";
import {
  classifyStripePublishableKey,
  classifyStripeSecretKey,
  getStripePriceEnvName,
  isStripeDevEndpointAllowed,
  readStripePriceId,
} from "@/lib/stripe-config";
import { getSiteUrl } from "@/lib/utils";

/**
 * Local-only status. Never available in production and never accepts live keys.
 * Does not create payments or echo secrets.
 */
export async function GET() {
  if (!isStripeDevEndpointAllowed()) {
    return NextResponse.json({ error: "Ikke tilgængelig" }, { status: 404 });
  }

  const products = ["session", "pack-5", "online"] as const;
  return NextResponse.json({
    testModeOnly: true,
    paymentsEnabled: isPaymentsEnabledByFlag(),
    paymentsReady: isPaymentsReady(),
    secretKey: classifyStripeSecretKey(process.env.STRIPE_SECRET_KEY),
    publishableKey: classifyStripePublishableKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() ? "set" : "missing",
    appUrl: getSiteUrl(),
    prices: Object.fromEntries(
      products.map((id) => [
        getStripePriceEnvName(id),
        readStripePriceId(id) ? "set" : "missing",
      ])
    ),
  });
}
