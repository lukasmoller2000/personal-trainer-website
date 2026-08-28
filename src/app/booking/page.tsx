import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageHero } from "@/components/ui/PageHero";
import { getVatSettings, isPaymentsReady } from "@/lib/commerce";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/booking", {
  title: "Book personlig træning i Viborg",
  description:
    "Book 1:1 PT i Viborg Fitness Gym, send en forespørgsel på 5 træninger, eller send en forespørgsel om online coaching.",
});

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string; klip?: string }>;
}) {
  const { produkt, klip } = await searchParams;
  const paymentsEnabled = isPaymentsReady();
  const collectBirthYear = getVatSettings().collectBirthYear;

  return (
    <>
      <PageHero
        eyebrow="Booking"
        title="Book eller send forespørgsel"
        description={
          paymentsEnabled
            ? "Vælg 1 træning, klippekort til 5 træninger eller online coaching. Enkelt PT bookes med tid. Klippekort købes først — tider bookes bagefter."
            : "1 træning bookes med dato og tid i Viborg Fitness Gym. 5 træninger sendes som forespørgsel — tider bookes, når klippekortet er aktivt. Online coaching er en forespørgsel. Når du har sendt, vender jeg tilbage med bekræftelse og betalingsinfo."
        }
      />
      <section className="pb-20 pt-10 md:pb-28">
        <div className="container-custom">
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
