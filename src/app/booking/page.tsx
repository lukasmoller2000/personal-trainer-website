import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageHero } from "@/components/ui/PageHero";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/booking", {
  title: "Booking",
  description:
    "Book personlig træning med dato og tid, eller send en forespørgsel om Online Coaching. Opstart aftales.",
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
        description="Personlig træning bookes med dato og tid. Online Coaching er en forespørgsel — opstart aftales."
      />
      <section className="pb-20 pt-10 md:pb-28">
        <div className="container-custom">
          <BookingWizard initialProductId={produkt} />
        </div>
      </section>
    </>
  );
}
