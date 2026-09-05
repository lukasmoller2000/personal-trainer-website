import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PaymentCanceledBanner } from "@/components/booking/PaymentCanceledBanner";
import { PageHero } from "@/components/ui/PageHero";
import { getVatSettings, isPaymentsReady } from "@/lib/commerce";
import { PAYMENT_CANCEL_QUERY } from "@/lib/payment-result";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/booking", {
  title: "Book personlig træning i Viborg",
  description:
    "Book 1:1 PT i Viborg Fitness Gym, send en forespørgsel på 5 træninger, eller send en forespørgsel om online coaching.",
});

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string; klip?: string; betaling?: string }>;
}) {
  const { produkt, klip, betaling } = await searchParams;
  const paymentsEnabled = isPaymentsReady();
  const collectBirthYear = getVatSettings().collectBirthYear;
  const paymentCanceled = betaling === PAYMENT_CANCEL_QUERY;

  return (
    <>
      <PageHero
        eyebrow="Booking"
        title="Book eller send forespørgsel"
        description={
          paymentsEnabled
            ? "Vælg 1 træning, klippekort til 5 træninger eller online coaching. Enkelt PT bookes med tid. Klippekort købes først — tider bookes bagefter."
            : "Dette er en forespørgsel — ikke en bekræftet tid. 1 træning: vælg ønsket dato og tid i Viborg Fitness Gym (træningssted). 5 træninger: uden tid nu — tider bookes, når klippekortet er aktivt. Online coaching: opstart aftales. Jeg vender tilbage med bekræftelse og betalingsinfo. 24-timers afbudsreglen gælder for bekræftede tider."
        }
      />
      <section className="pb-20 pt-10 md:pb-28">
        <div className="container-custom">
          {paymentCanceled ? <PaymentCanceledBanner productId={produkt} /> : null}
          <BookingWizard
            initialProductId={produkt}
            clipToken={klip}
            paymentsEnabled={paymentsEnabled}
            collectBirthYear={collectBirthYear}
          />
        </div>
      </section>
    </>
  );
}
