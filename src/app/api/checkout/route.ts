import { NextRequest, NextResponse } from "next/server";
import {
  isPaymentsReady,
  missingPaymentEnv,
  paymentsNotConfiguredMessage,
  sessionDuration,
  cancellationConfig,
  getVatSettings,
} from "@/lib/commerce";
import { createPendingOrder, attachStripeSession } from "@/lib/orders";
import {
  getCheckoutAmountOre,
  getProduct,
  isPaidProduct,
  requiresTimeslot,
} from "@/lib/products";
import { getTakenTimes } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getSlotsForDate, isBookableDate } from "@/lib/availability";
import { getClientKey, rateLimit } from "@/lib/rate-limit";
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

  if (!isPaymentsReady()) {
    return NextResponse.json(
      { error: paymentsNotConfiguredMessage(), missing: missingPaymentEnv() },
      { status: 503 }
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

  const productId = readString(body, "productId").trim();
  const date = readString(body, "date").trim();
  const time = readString(body, "time").trim();
  const name = readString(body, "name");
  const email = readString(body, "email");
  const phone = readString(body, "phone");
  const goal = readString(body, "goal");
  const notes = readString(body, "notes");
  const birthYearRaw = body.birthYear;

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

  const product = getProduct(productId);
  if (!product || !isPaidProduct(product)) {
    return NextResponse.json({ error: "Ukendt ydelse" }, { status: 400 });
  }

  const amountOre = getCheckoutAmountOre(productId);
  if (amountOre == null) {
    return NextResponse.json({ error: "Ukendt ydelse" }, { status: 400 });
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

  try {
    const order = await createPendingOrder({
      productId,
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
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email.trim(),
      client_reference_id: order.id,
      success_url: `${siteUrl}/booking/bekraeftelse?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/booking?produkt=${encodeURIComponent(productId)}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: {
        orderId: order.id,
        productId,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "dkk",
            unit_amount: order.amountOre,
            product_data: {
              name: product.name,
              description: [
                product.priceNote,
                `Ca. ${sessionDuration.minutes} min. pr. træning.`,
                `Gratis aflysning indtil ${cancellationConfig.freeCancelHours} timer før.`,
              ]
                .filter(Boolean)
                .join(" "),
            },
          },
        },
      ],
    });

    if (!session.url) {
      return NextResponse.json({ error: "Kunne ikke starte betaling" }, { status: 502 });
    }

    await attachStripeSession(order.id, session.id);

    return NextResponse.json({ url: session.url, orderId: order.id });
  } catch (error) {
    console.error("Checkout fejlede", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Kunne ikke starte betaling. Prøv igen." }, { status: 500 });
  }
}
