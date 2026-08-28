import type { Metadata } from "next";
import { PaymentConfirmation } from "@/components/booking/PaymentConfirmation";
import { PageHero } from "@/components/ui/PageHero";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/booking/bekraeftelse", {
  title: "Bekræftelse",
  description: "Bekræftelse af din betaling og booking hos Lukas Møller.",
  robots: { index: false, follow: false },
});

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  return (
    <>
      <PageHero
        eyebrow="Booking"
        title="Bekræftelse"
        description="Vi viser kun booking og klippekort som betalt, når betalingen er verificeret."
      />
      <section className="pb-20 pt-10 md:pb-28">
        <div className="container-custom">
          <PaymentConfirmation sessionId={sessionId?.trim() ?? ""} />
        </div>
      </section>
    </>
  );
}
