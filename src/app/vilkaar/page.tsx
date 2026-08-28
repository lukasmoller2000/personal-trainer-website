import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { siteConfig } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";
import {
  cancellationConfig,
  clipCardValidity,
  getCompanyConfig,
  sessionDuration,
} from "@/lib/commerce";

export const metadata: Metadata = pageSeo("/vilkaar", {
  title: "Handelsbetingelser",
  description:
    "Betingelser for personlig træning, klippekort og Online Coaching hos Lukas Møller.",
});

export default function TermsPage() {
  const company = getCompanyConfig();

  return (
    <>
      <PageHero eyebrow="Jura" title="Handelsbetingelser" description="Senest opdateret: august 2026" />
      <AnimatedSection>
        {/* LEGAL_PENDING: Review with Lukas before live Stripe payments. */}
        <div className="container-custom max-w-3xl space-y-8 leading-relaxed text-ink/75">
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              1. Virksomheden
            </h2>
            <p>
              {company.name}
              <br />
              {company.tradeName}
            </p>
            {company.cvr ? <p className="mt-3">CVR: {company.cvr}</p> : null}
            {company.address ? <p className="mt-3">{company.address}</p> : null}
            <p className="mt-3">
              Email: {siteConfig.links.email}
              <br />
              Telefon: {siteConfig.links.phone}
            </p>
            <p className="mt-3">
              Personlig træning foregår i {siteConfig.venue}, {siteConfig.address}.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              2. Priser og betaling
            </h2>
            <p>
              Enkelt personlig træning koster 300 kr. Fem træninger koster 1.350 kr. (270 kr. pr.
              træning). Online Coaching koster 799 kr. pr. måned og opsiges måneden ud. Den pris, du
              ser før betaling, er den pris, du betaler.
            </p>
            <p className="mt-3">
              Når online betaling er slået til, betaler du med kort via Stripe, før booking eller
              klippekort aktiveres. Vi gemmer ikke dit kortnummer. Indtil betaling er slået til,
              sender du en forespørgsel, og jeg vender tilbage med betalingsinfo.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              3. Booking
            </h2>
            <p>
              Enkelt PT bookes med dato og tid. Klippekort til 5 træninger sendes uden tid — du
              booker træningerne bagefter, når kortet er aktivt. En tid gælder først, når betalingen
              er bekræftet, eller når et klip er trukket. Online Coaching bookes som forespørgsel;
              opstart aftales.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              4. Klippekort
            </h2>
            <p>
              Ved køb af 5 træninger får du et klippekort med tilsvarende saldo. Hver
              booket træning trækker ét klip. Du kan se, hvor mange træninger du har tilbage, når du
              booker.
            </p>
            <p className="mt-3">
              {clipCardValidity.months > 0
                ? `Klippekortet gælder ${clipCardValidity.months} måneder fra køb.`
                : "Klippekortet har ikke en fast udløbsdato, medmindre andet aftales."}
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              5. Aflysning og ombooking
            </h2>
            <p>
              Du kan aflyse eller flytte en træning gratis indtil {cancellationConfig.freeCancelHours}{" "}
              timer før start. Skriv til {siteConfig.links.email} eller ring {siteConfig.links.phone}.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              6. Udeblivelse
            </h2>
            <p>
              Afbud senere end {cancellationConfig.freeCancelHours} timer før, eller udeblivelse,
              tæller som en brugt træning. Ved enkeltbooking refunderes beløbet ikke automatisk. Ved
              klippekort trækkes klippet.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              7. Refundering
            </h2>
            {/* LEGAL_PENDING: No automated consumer-refund rules beyond unused-pack cancellation. */}
            <p>
              Ubrugte klippekort kan i særlige tilfælde refunderes efter aftale, hvis ingen klip er
              brugt. Delvist brugte kort og enkeltbookinger vurderes manuelt. Der er ingen automatisk
              refundering i systemet.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              8. Sessionens varighed
            </h2>
            <p>{sessionDuration.copy}</p>
            <p className="mt-3">{sessionDuration.notAPromise}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              9. Ansvar
            </h2>
            <p>
              Træning sker på eget ansvar. Sig til, hvis du har skader eller begrænsninger, så vi
              kan tilpasse øvelserne. Jeg kan aflyse ved sygdom eller force majeure og tilbyder i så
              fald en ny tid eller at lægge klippet tilbage.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              10. Forbrugerrettigheder
            </h2>
            {/* LEGAL_PENDING: Distance selling / 14-day withdrawal for services may be limited once performance has begun. Confirm with advisor. */}
            <p>
              Du handler som forbruger. Har du spørgsmål til aftalen, priser eller fortrydelse, så
              skriv til {siteConfig.links.email}, inden du booker. Når en træning er gennemført, eller
              et klip er brugt, kan den del af ydelsen som udgangspunkt ikke fortrydes.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              11. Kontakt
            </h2>
            <p>
              {siteConfig.links.email}
              <br />
              {siteConfig.links.phone}
            </p>
          </section>
        </div>
      </AnimatedSection>
    </>
  );
}
