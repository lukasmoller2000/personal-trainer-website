import { NextRequest, NextResponse } from "next/server";
import { claimStripeEvent } from "@/lib/clip-cards";
import { isPaymentsReady, paymentsNotConfiguredMessage } from "@/lib/commerce";
import { failPendingOrder, fulfillPaidOrder } from "@/lib/orders";
import { getPrisma } from "@/lib/db";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

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

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Mangler underskrift" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Ugyldig underskrift" }, { status: 400 });
  }

  const claimed = await claimStripeEvent(event.id, event.type);
  if (claimed === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId =
        (typeof session.metadata?.orderId === "string" && session.metadata.orderId) ||
        (typeof session.client_reference_id === "string" ? session.client_reference_id : "");
      if (!orderId) {
        console.error("Stripe session uden orderId");
        return NextResponse.json({ received: true });
      }
      if (session.payment_status !== "paid") {
        return NextResponse.json({ received: true, pending: true });
      }
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
      await fulfillPaidOrder({ orderId, stripePaymentIntentId: paymentIntent });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const orderId =
        (typeof session.metadata?.orderId === "string" && session.metadata.orderId) ||
        "";
      if (orderId) await failPendingOrder(orderId);
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      const orderId =
        (typeof session.metadata?.orderId === "string" && session.metadata.orderId) ||
        "";
      if (orderId) await failPendingOrder(orderId);
    }
  } catch (error) {
    console.error("Webhook-behandling fejlede", event.id, error instanceof Error ? error.name : "unknown");
    const prisma = getPrisma();
    if (prisma) {
      await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    }
    return NextResponse.json({ error: "Webhook fejlede" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
