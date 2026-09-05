import { notFound } from "next/navigation";
import { getSlotsForDate, isBookableDate, toIsoDate } from "@/lib/availability";
import { getVatSettings } from "@/lib/commerce";
import { getTakenTimes } from "@/lib/db";
import {
  buildStripeDevCheckoutPayload,
  STRIPE_DEV_TEST_PACK5_PRODUCT_ID,
} from "@/lib/stripe-dev-checkout-test";
import { isStripeDevCheckoutTestAllowed } from "@/lib/stripe-config";
import { StripeTestCheckout } from "./StripeTestCheckout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stripe TEST",
  robots: { index: false, follow: false },
};

async function createStripeDevCheckoutPayload() {
  const cursor = new Date();
  for (let i = 0; i < 21; i += 1) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isBookableDate(cursor)) continue;
    const date = toIsoDate(cursor);
    const taken = await getTakenTimes(date);
    const time = getSlotsForDate(cursor).find((slot) => !taken.includes(slot));
    if (!time) continue;
    const vat = getVatSettings();
    const shared = {
      date,
      time,
      birthYear: vat.collectBirthYear ? 1990 : null,
    };
    return {
      sessionPayload: buildStripeDevCheckoutPayload(shared),
      pack5Payload: buildStripeDevCheckoutPayload({
        ...shared,
        productId: STRIPE_DEV_TEST_PACK5_PRODUCT_ID,
      }),
    };
  }
  return null;
}

export default async function StripeTestPage() {
  if (!isStripeDevCheckoutTestAllowed()) notFound();

  const payloads = await createStripeDevCheckoutPayload();
  if (!payloads) notFound();

  return (
    <section className="flex min-h-svh items-center justify-center px-5 pb-20 pt-32 md:pt-40">
      <div className="w-full max-w-md rounded-2xl border border-sand bg-white p-8 shadow-soft md:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Stripe TEST
        </h1>
        <p className="mt-3 text-ink/60">Kun lokal testbetaling</p>
        <dl className="mt-8 space-y-3 border-t border-sand pt-6">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">
              Produkt
            </dt>
            <dd className="font-medium text-ink">PT session / 5 PT-klip</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">
              Pris
            </dt>
            <dd className="font-medium text-ink">300 kr. / 1.350 kr.</dd>
          </div>
        </dl>
        <StripeTestCheckout
          sessionPayload={payloads.sessionPayload}
          pack5Payload={payloads.pack5Payload}
        />
      </div>
    </section>
  );
}
