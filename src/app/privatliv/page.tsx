import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { siteConfig } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privatlivspolitik",
  description: "Hvordan Lukas Møller behandler personoplysninger.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Jura" title="Privatlivspolitik" description="Senest opdateret: august 2026" />
      <AnimatedSection>
        <div className="container-custom max-w-3xl space-y-8 leading-relaxed text-ink/75">
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              1. Dataansvarlig
            </h2>
            <p>
              {siteConfig.name} er dataansvarlig for de oplysninger, du giver via hjemmesiden,
              herunder booking og kontaktformular.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              2. Hvad vi indsamler
            </h2>
            <p>
              Navn, email, telefon, dit mål og eventuelle bemærkninger, når du booker eller skriver.
              Vi bruger oplysningerne til at gennemføre træning og svare dig.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              3. Opbevaring og videregivelse
            </h2>
            <p>
              Booking- og kontaktforespørgsler sendes til {siteConfig.trainer} via e-mail, så
              henvendelsen kan besvares. E-mailen sendes med Resend som databehandler. Vi gemmer
              ikke bookinger i en kalenderdatabase på siden, og vi sælger ikke dine data. Du kan
              skrive til {siteConfig.links.email} for indsigt eller sletning.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              4. Retsgrundlag
            </h2>
            <p>
              Oplysningerne behandles for at kunne besvare din henvendelse og levere den ydelse,
              du har bedt om (kontrakt/foranstaltninger forud for kontrakt).
            </p>
          </section>
        </div>
      </AnimatedSection>
    </>
  );
}
