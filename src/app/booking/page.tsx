import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageHero } from "@/components/ui/PageHero";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/booking", {
  title: "Book personlig træning i Viborg",
  description:
    "Book 1:1 PT i Viborg Fitness Gym med dato og tid, eller send en forespørgsel om online coaching. Jeg bekræfter bagefter — tiden reserveres ikke automatisk.",
});

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string }>;
}) {
  const { produkt } = await searchParams;

  return (
    <>
      <PageHero
        eyebrow="Booking"
        title="Book eller send forespørgsel"
        description="Personlig træning bookes med dato og tid i Viborg Fitness Gym. Online coaching er en forespørgsel — opstart aftales. Når du har sendt, vender jeg tilbage med bekræftelse og betalingsinfo."
      />
      <section className="pb-20 pt-10 md:pb-28">
        <div className="container-custom">
          <BookingWizard initialProductId={produkt} />
        </div>
      </section>
    </>
  );
}
