import { NextRequest, NextResponse } from "next/server";
import { claimStripeEvent } from "@/lib/clip-cards";
import { isPaymentsReady, paymentsNotConfiguredMessage } from "@/lib/commerce";
import { failPendingOrder, fulfillPaidOrder } from "@/lib/orders";
import { getPrisma } from "@/lib/db";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { matchStripePaymentToCatalog, verifyStripeWebhookSignature } from "@/lib/stripe-fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function orderIdFromSession(session: {
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
}) {
  if (typeof session.metadata?.orderId === "string" && session.metadata.orderId) {
    return session.metadata.orderId;
  }
  if (typeof session.client_reference_id === "string" && session.client_reference_id) {
    return session.client_reference_id;
  }
  return "";
}

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

  const event = verified.event;
  const claimed = await claimStripeEvent(event.id, event.type);
  if (claimed === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = orderIdFromSession(session);
      if (!orderId) {
        console.error("Stripe session uden orderId");
        return NextResponse.json({ received: true });
      }

      const prisma = getPrisma();
      const order = prisma
        ? await prisma.order.findUnique({ where: { id: orderId } })
        : null;
      if (!order) {
        console.error("Stripe session uden lokal ordre");
        return NextResponse.json({ received: true });
      }

      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items.data.price"],
      });

      const priceIds: string[] = [];
      for (const item of fullSession.line_items?.data ?? []) {
        const price = item.price;
        if (typeof price === "string") priceIds.push(price);
        else if (price?.id) priceIds.push(price.id);
      }

      const match = matchStripePaymentToCatalog(order.productId, {
        paymentStatus: fullSession.payment_status,
        amountTotal: fullSession.amount_total,
        currency: fullSession.currency,
        priceIds,
        metadataAmount: session.metadata?.amount,
      });
      if (!match.ok) {
        console.error("Stripe-betaling matchede ikke kataloget", match.reason);
        return NextResponse.json({ received: true, rejected: match.reason });
      }

      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;
      await fulfillPaidOrder({ orderId, stripePaymentIntentId: paymentIntent });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const orderId = orderIdFromSession(session);
      if (orderId) await failPendingOrder(orderId);
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object;
      const orderId = orderIdFromSession(session);
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
