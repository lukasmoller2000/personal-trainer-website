import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { siteConfig } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Handelsbetingelser",
  description: "Betingelser for booking af personlig træning hos Lukas Møller.",
};

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Jura" title="Handelsbetingelser" description="Senest opdateret: august 2026" />
      <AnimatedSection>
        <div className="container-custom max-w-3xl space-y-8 leading-relaxed text-ink/75">
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              1. Ydelser
            </h2>
            <p>
              Du kan booke én personlig træning til 350 kr. eller Online Coaching fra 799 kr./md.
              Online Coaching opsiges måneden ud.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              2. Aflysning
            </h2>
            <p>
              Enkelt PT: aflys eller flyt senest 24 timer før. Senere afbud tæller som fuld pris.
              Online Coaching opsiges måneden ud.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              3. Betaling
            </h2>
            <p>
              Betaling sker efter bekræftelse via MobilePay eller overførsel, medmindre andet er
              aftalt. Kontakt {siteConfig.links.email} ved spørgsmål.
            </p>
          </section>
        </div>
      </AnimatedSection>
    </>
  );
}
