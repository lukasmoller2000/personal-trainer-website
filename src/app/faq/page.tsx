import type { Metadata } from "next";
import { FAQ } from "@/components/sections/FAQ";
import { PageHero } from "@/components/ui/PageHero";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/faq", {
  title: "FAQ",
  description:
    "Ofte stillede spørgsmål om personlig træning, Online Coaching og booking hos Lukas Møller.",
});

export default function FAQPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Spørgsmål og svar"
        description="Det, folk typisk spørger om, før de booker PT eller starter Online Coaching."
      />
      <FAQ showHeading={false} />
      <CtaBanner />
    </>
  );
}
