import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  bookingPaymentCancelPath,
  evaluateSessionCheckoutBinding,
} from "@/lib/booking-payment";
import { evaluateCheckoutStart, type CheckoutStartOk } from "@/lib/checkout-guard";
import {
  ensureOpenCheckoutSession,
  type CheckoutSessionView,
} from "@/lib/checkout-idempotency";
import { getVatSettings, paymentsNotConfiguredMessage } from "@/lib/commerce";
import {
  attachStripeSession,
  createPendingOrder,
  createPendingOrderForExistingBooking,
} from "@/lib/orders";
import { getProduct, requiresTimeslot } from "@/lib/products";
import { getPrisma, getTakenTimes } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { STRIPE_CHECKOUT_MODE } from "@/lib/stripe-config";
import { buildStripeCheckoutLineItem, safeCheckoutMetadata } from "@/lib/stripe-fulfillment";
import {
  isActiveVfgMember,
  lookupVfgMembership,
  type VfgMembershipLookupResult,
} from "@/lib/vfg-membership";
import { getSlotsForDate, isBookableDate } from "@/lib/availability";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
import { bookingCancelQuery } from "@/lib/payment-result";
import { getSiteUrl } from "@/lib/utils";
import {
  honeypotFilled,
  isClockTime,
  isFilled,
  isIsoDate,
  isValidEmail,
  isValidPhone,
  readString,
} from "@/lib/validation";

function pricedCheckout(input: {
  productId: string;
  earlyPerformanceRequested: boolean;
  membership: VfgMembershipLookupResult;
  clientAmount?: number;
  clientIsMember?: unknown;
  clientIsVfgMember?: unknown;
  clientPriceTier?: unknown;
}) {
  return evaluateCheckoutStart({
    productId: input.productId,
    clientAmount: input.clientAmount,
    isMember: input.clientIsMember,
    isVfgMember: input.clientIsVfgMember,
    priceTier: input.clientPriceTier,
    serverVerifiedVfgMember: isActiveVfgMember(input.membership),
    earlyPerformanceRequested: input.earlyPerformanceRequested,
  });
}

function checkoutLineItem(productName: string, checkout: CheckoutStartOk) {
  return buildStripeCheckoutLineItem({
    productName,
    amountOre: checkout.amountOre,
    stripePriceId: checkout.stripePriceId,
    memberStripePriceId: checkout.memberStripePriceId,
    priceTier: checkout.priceTier,
    usePriceData: checkout.usePriceData,
  });
}

function toCheckoutSessionView(session: Stripe.Checkout.Session): CheckoutSessionView {
  return {
    id: session.id,
    url: session.url,
    status: session.status,
    expires_at: session.expires_at,
    payment_status: session.payment_status,
    amount_total: session.amount_total,
  };
}

async function retrieveCheckoutSessionView(
  stripe: Stripe,
  sessionId: string
): Promise<CheckoutSessionView | null> {
  try {
    return toCheckoutSessionView(await stripe.checkout.sessions.retrieve(sessionId));
  } catch {
    return null;
  }
}

async function openOrCreateCheckoutSession(input: {
  stripe: Stripe;
  orderId: string;
  existingSessionId: string | null;
  expectedAmountOre: number;
  createParams: Stripe.Checkout.SessionCreateParams;
}) {
  return ensureOpenCheckoutSession({
    orderId: input.orderId,
    existingSessionId: input.existingSessionId,
    expectedAmountOre: input.expectedAmountOre,
    sessions: {
      retrieve: (id) => retrieveCheckoutSessionView(input.stripe, id),
      create: async (idempotencyKey) =>
        toCheckoutSessionView(
          await input.stripe.checkout.sessions.create(input.createParams, { idempotencyKey })
        ),
    },
    attachSession: attachStripeSession,
  });
}

function limited(request: NextRequest) {
  const result = rateLimit(`checkout:${getClientKey(request)}`);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "For mange forsøg. Vent et øjeblik, og prøv igen." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}

export async function POST(request: NextRequest) {
  const blocked = limited(request);
  if (blocked) return blocked;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 });
  }

  if (honeypotFilled(body.website)) {
    return NextResponse.json({ ok: true });
  }

  const productId = readString(body, "productId").trim();
  console.info("[checkout] request received", { method: "POST", path: "/api/checkout", productId });
  const date = readString(body, "date").trim();
  const time = readString(body, "time").trim();
  const name = readString(body, "name");
  const email = readString(body, "email");
  const phone = readString(body, "phone");
  const goal = readString(body, "goal");
  const notes = readString(body, "notes");
  const paymentToken = readString(body, "paymentToken").trim();
  const birthYearRaw = body.birthYear;
  const earlyPerformanceRequested = body.earlyPerformanceRequested === true;
  const clientAmount = typeof body.amount === "number" ? body.amount : undefined;
  void body.isMember;
  void body.isVfgMember;
  void body.priceTier;
  void body.vfgMemberVerified;
  void body.chargedAmount;
  void body.requestId;
  void body.idempotencyKey;

  const paymentsGate = evaluateCheckoutStart({
    productId,
    clientAmount,
    isMember: body.isMember,
    isVfgMember: body.isVfgMember,
    priceTier: body.priceTier,
    earlyPerformanceRequested,
  });
  if (!paymentsGate.ok) {
    return NextResponse.json(
      { error: paymentsGate.error, reason: paymentsGate.reason },
      { status: paymentsGate.status }
    );
  }

  const product = getProduct(productId);
  if (!product) {
    return NextResponse.json({ error: "Ukendt ydelse" }, { status: 400 });
  }

  const vat = getVatSettings();
  let birthYear: number | null = null;
  if (vat.collectBirthYear) {
    const parsed =
      typeof birthYearRaw === "number" ? birthYearRaw : Number(readString(body, "birthYear"));
    const current = new Date().getFullYear();
    if (!Number.isInteger(parsed) || parsed < 1920 || parsed > current) {
      return NextResponse.json({ error: "Angiv fødselsår" }, { status: 400 });
    }
    birthYear = parsed;
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: paymentsNotConfiguredMessage() }, { status: 503 });
  }

  const sessionCheckout = product.id === "session";
  if (sessionCheckout) {
    const binding = evaluateSessionCheckoutBinding({
      paymentToken,
      productId,
      clientAmount,
    });
    if (!binding.ok) {
      return NextResponse.json(
        { error: binding.error, reason: binding.reason },
        { status: 400 }
      );
    }

    try {
      const prisma = getPrisma();
      const booking = prisma
        ? await prisma.booking.findUnique({ where: { id: binding.bookingId } })
        : null;
      const membership = await lookupVfgMembership({
        email: booking?.email,
        phone: booking?.phone,
      });
      const checkout = pricedCheckout({
        productId,
        earlyPerformanceRequested: true,
        membership,
        clientAmount,
        clientIsMember: body.isMember,
        clientIsVfgMember: body.isVfgMember,
        clientPriceTier: body.priceTier,
      });
      if (!checkout.ok) {
        return NextResponse.json(
          { error: checkout.error, reason: checkout.reason },
          { status: checkout.status }
        );
      }

      const { order, bookingId } = await createPendingOrderForExistingBooking({
        bookingId: binding.bookingId,
        earlyPerformanceRequested: true,
        birthYear,
        membership,
      });

      const siteUrl = getSiteUrl();
      const session = await openOrCreateCheckoutSession({
        stripe,
        orderId: order.id,
        existingSessionId: order.stripeCheckoutSessionId,
        expectedAmountOre: checkout.amountOre,
        createParams: {
          mode: STRIPE_CHECKOUT_MODE,
          customer_email: order.customerEmail,
          client_reference_id: order.id,
          success_url: `${siteUrl}/booking/bekraeftelse?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${siteUrl}${bookingPaymentCancelPath(paymentToken)}`,
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
          metadata: safeCheckoutMetadata({
            productId: order.productId,
            orderId: order.id,
            bookingId,
          }),
          line_items: [checkoutLineItem(product.name, checkout)],
        },
      });

      if (!session.ok) {
        const status = session.reason === "no_url" ? 502 : 409;
        console.info("[checkout] session not reusable", { productId, status, reason: session.reason });
        return NextResponse.json(
          {
            error:
              session.reason === "no_url"
                ? "Kunne ikke starte betaling"
                : "Betalingen er allerede gennemført",
          },
          { status }
        );
      }

      console.info("[checkout] checkout url received", { productId, status: 200, hasCheckoutUrl: true });
      return NextResponse.json({ url: session.url, orderId: order.id });
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "unknown";
      const message = error instanceof Error ? error.message : "";
      console.error("Checkout fejlede", errorName);
      console.info("[checkout] error", { productId, status: 500, error: errorName });
      if (/DATABASE_URL|ikke konfigureret/i.test(message)) {
        return NextResponse.json({ error: "Betaling er ikke aktiveret endnu" }, { status: 503 });
      }
      if (message && /ikke|mangler|status|fundet|booking/i.test(message)) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      return NextResponse.json({ error: "Kunne ikke starte betaling. Prøv igen." }, { status: 500 });
    }
  }

  if (!productId || !isFilled(name, 80) || !isFilled(goal, 200)) {
    return NextResponse.json({ error: "Udfyld alle påkrævede felter" }, { status: 400 });
  }
  if (!isValidEmail(email.trim())) {
    return NextResponse.json({ error: "Ugyldig email" }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "Ugyldigt telefonnummer" }, { status: 400 });
  }
  if (notes.trim().length > 2000) {
    return NextResponse.json({ error: "Bemærkningen er for lang" }, { status: 400 });
  }

  const needsTimeslot = requiresTimeslot(product);
  if (needsTimeslot) {
    if (!isIsoDate(date) || !isClockTime(time)) {
      return NextResponse.json(
        { error: "Vælg dato og tidspunkt for din træning" },
        { status: 400 }
      );
    }
    const parsed = new Date(`${date}T12:00:00`);
    if (!isBookableDate(parsed) || !getSlotsForDate(parsed).includes(time)) {
      return NextResponse.json({ error: "Tidspunktet er ikke ledigt" }, { status: 400 });
    }
    const taken = await getTakenTimes(date);
    if (taken.includes(time)) {
      return NextResponse.json({ error: "Tidspunktet er ikke ledigt" }, { status: 400 });
    }
  }

  try {
    const membership = await lookupVfgMembership({
      email: email.trim(),
      phone: phone.trim(),
    });
    const checkout = pricedCheckout({
      productId,
      earlyPerformanceRequested: true,
      membership,
      clientAmount,
      clientIsMember: body.isMember,
      clientIsVfgMember: body.isVfgMember,
      clientPriceTier: body.priceTier,
    });
    if (!checkout.ok) {
      return NextResponse.json(
        { error: checkout.error, reason: checkout.reason },
        { status: checkout.status }
      );
    }

    const { order, bookingId } = await createPendingOrder({
      productId,
      earlyPerformanceRequested: true,
      membership,
      customer: {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        goal: goal.trim(),
        notes: notes.trim() || undefined,
        date: needsTimeslot ? date : undefined,
        time: needsTimeslot ? time : undefined,
        birthYear,
      },
    });

    const siteUrl = getSiteUrl();
    const session = await openOrCreateCheckoutSession({
      stripe,
      orderId: order.id,
      existingSessionId: order.stripeCheckoutSessionId,
      expectedAmountOre: checkout.amountOre,
      createParams: {
        mode: STRIPE_CHECKOUT_MODE,
        customer_email: email.trim(),
        client_reference_id: order.id,
        success_url: `${siteUrl}/booking/bekraeftelse?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}${bookingCancelQuery(productId)}`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        metadata: safeCheckoutMetadata({
          productId,
          orderId: order.id,
          bookingId,
        }),
        line_items: [checkoutLineItem(product.name, checkout)],
      },
    });

    if (!session.ok) {
      const status = session.reason === "no_url" ? 502 : 409;
      console.info("[checkout] session not reusable", { productId, status, reason: session.reason });
      return NextResponse.json(
        {
          error:
            session.reason === "no_url"
              ? "Kunne ikke starte betaling"
              : "Betalingen er allerede gennemført",
        },
        { status }
      );
    }

    console.info("[checkout] checkout url received", { productId, status: 200, hasCheckoutUrl: true });
    return NextResponse.json({ url: session.url, orderId: order.id });
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    console.error("Checkout fejlede", name);
    console.info("[checkout] error", { productId, status: 500, error: name });
    return NextResponse.json({ error: "Kunne ikke starte betaling. Prøv igen." }, { status: 500 });
  }
}
