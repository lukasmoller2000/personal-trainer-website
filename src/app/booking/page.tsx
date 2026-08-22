import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageHero } from "@/components/ui/PageHero";

export const metadata: Metadata = {
  title: "Booking",
  description:
    "Vælg den løsning, der passer til dig, og tag første skridt mod dine mål.",
};

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
        title="Book dit forløb"
        description="Vælg den løsning, der passer til dig, og tag første skridt mod dine mål."
      />
      <section className="pb-20 pt-10 md:pb-28">
        <div className="container-custom">
          <BookingWizard initialProductId={produkt} />
        </div>
      </section>
    </>
  );
}
