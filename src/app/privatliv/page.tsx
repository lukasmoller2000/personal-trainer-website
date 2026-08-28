import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { siteConfig } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";
import { getCompanyConfig } from "@/lib/commerce";

export const metadata: Metadata = pageSeo("/privatliv", {
  title: "Privatlivspolitik",
  description: "Hvordan Lukas Møller behandler personoplysninger.",
});

export default function PrivacyPage() {
  const company = getCompanyConfig();

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
              {company.name} ({company.tradeName}) er dataansvarlig for de personoplysninger, du
              giver via hjemmesiden, herunder booking, køb og kontaktformular.
            </p>
            <p className="mt-3">
              {company.name}
              <br />
              {company.cvr ? (
                <>
                  CVR: {company.cvr}
                  <br />
                </>
              ) : null}
              {company.address ? (
                <>
                  {company.address}
                  <br />
                </>
              ) : null}
              Email: {siteConfig.links.email}
              <br />
              Telefon: {siteConfig.links.phone}
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              2. Hvad vi indsamler
            </h2>
            <p>
              Når du booker eller køber, indsamler vi navn, email, telefonnummer, dit mål og
              eventuelle bemærkninger. Ved enkelt PT indsamler vi også ønsket dato og tid. Ved
              klippekort gemmer vi saldo og et booking-link knyttet til din mail. Når du skriver via
              kontaktformularen, indsamler vi navn, email, telefonnummer og din besked.
            </p>
            <p className="mt-3">
              Vi indsamler ikke CPR-nummer og beder ikke om helbredsdata i checkout. Skriver du selv
              om skader i fritekst, bruges det kun til at svare og tilrettelægge træning. Fødselsår
              indsamles kun, hvis det senere er slået til af moms-hensyn.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              3. Betaling
            </h2>
            <p>
              Kortbetaling sker hos Stripe. Vi modtager betalingsstatus, session-id og
              betalings-id. Vi gemmer ikke kortnummer, udløb eller CVC. Stripe er selvstændig
              dataansvarlig/databehandler for selve kortoplysningerne.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              4. Formål
            </h2>
            <p>
              Oplysningerne bruges til at gennemføre booking og køb, sende bekræftelse, holde
              klippekort-saldo, bogføre betaling og besvare din henvendelse. Vi bruger ikke
              oplysningerne til nyhedsbreve, medmindre du selv beder om det.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              5. Retsgrundlag
            </h2>
            <p>
              Behandlingen sker for at opfylde eller forberede en aftale med dig (GDPR art. 6, stk.
              1, litra b) og for bogføring, hvor det er påkrævet (art. 6, stk. 1, litra c). Eventuel
              fritekst om helbred behandles kun, hvis du selv har givet den, og det er nødvendigt for
              træningen.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              6. Databehandlere og videregivelse
            </h2>
            <p>
              E-mail sendes med Resend. Betaling behandles af Stripe. Database (hvis tilkoblet) er
              PostgreSQL hos hostingudbyderen. Resend og Stripe er amerikanske udbydere, så
              oplysninger kan behandles uden for EU/EØS. De tilbyder databehandleraftaler.
            </p>
            <p className="mt-3">
              Vi sælger ikke dine data. Vi deler dem kun, hvis det er nødvendigt for at levere
              træningen eller vi er forpligtet ved lov.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              7. Opbevaring
            </h2>
            <p>
              Booking- og købsoplysninger opbevares, så træningen kan gennemføres, og så betaling kan
              dokumenteres. Bogføringsrelevante oplysninger kan opbevares i den periode, loven kræver.
              Når der ikke længere er et praktisk eller retligt behov, slettes oplysningerne efter
              anmodning eller i almindelig oprydning. Skriv til {siteConfig.links.email} for indsigt
              eller sletning.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              8. Cookies
            </h2>
            <p>
              Siden bruger ikke analyse-, reklame- eller tracking-cookies. Hostingudbyderen kan
              sætte teknisk nødvendige cookies. Stripe kan sætte cookies på deres betalingsside.
              Admin-login bruger en httpOnly-cookie, som kun gælder, hvis admin er slået til.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              9. Dine rettigheder
            </h2>
            <p>
              Du kan bede om indsigt, berigtigelse, sletning, begrænsning, dataportabilitet og
              gøre indsigelse. Skriv til {siteConfig.links.email}. Du kan også klage til
              Datatilsynet (
              <a
                href="https://www.datatilsynet.dk"
                className="text-ink underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                datatilsynet.dk
              </a>
              ).
            </p>
          </section>
        </div>
      </AnimatedSection>
    </>
  );
}
