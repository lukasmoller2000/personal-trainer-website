import { NextRequest, NextResponse } from "next/server";
import { isPaymentsReady, paymentsNotConfiguredMessage } from "@/lib/commerce";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { verifyStripeWebhookSignature } from "@/lib/stripe-fulfillment";
import {
  createDefaultStripeWebhookDeps,
  processVerifiedStripeEvent,
  type StripeWebhookEvent,
} from "@/lib/stripe-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isPaymentsReady()) {
    return NextResponse.json({ error: paymentsNotConfiguredMessage() }, { status: 503 });
  }

  const stripe = getStripe();
  const secret = getStripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ error: paymentsNotConfiguredMessage() }, { status: 503 });
  }

  const rawBody = await request.text();
  const verified = verifyStripeWebhookSignature({
    payload: rawBody,
    signature: request.headers.get("stripe-signature"),
    secret,
    constructEvent: (payload, signature, webhookSecret) =>
      stripe.webhooks.constructEvent(payload, signature, webhookSecret),
  });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  const result = await processVerifiedStripeEvent({
    event: verified.event as StripeWebhookEvent,
    ...createDefaultStripeWebhookDeps((sessionId) =>
      stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items.data.price"],
      })
    ),
  });

  return NextResponse.json(result.body, { status: result.status });
}
