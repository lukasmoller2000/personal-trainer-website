import type { Metadata } from "next";
import { FAQ } from "@/components/sections/FAQ";
import { PageHero } from "@/components/ui/PageHero";
import { CtaBanner } from "@/components/sections/CtaBanner";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Ofte stillede spørgsmål om personlig træning, forløb og booking hos Lukas Møller.",
};

export default function FAQPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Spørgsmål og svar"
        description="Det, folk typisk spørger om, før de booker en session eller et forløb."
      />
      <FAQ showHeading={false} />
      <CtaBanner />
    </>
  );
}
