import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { siteConfig } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/privatliv", {
  title: "Privatlivspolitik",
  description: "Hvordan Lukas Møller behandler personoplysninger.",
});

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
              {siteConfig.name} er dataansvarlig for de personoplysninger, du giver via hjemmesiden,
              herunder booking og kontaktformular.
            </p>
            <p className="mt-3">
              {siteConfig.trainer}
              <br />
              {siteConfig.address}
              <br />
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
              Når du booker, indsamler vi navn, email, telefonnummer, dit mål, eventuelle
              bemærkninger og — ved personlig træning — ønsket dato og tid. Når du skriver via
              kontaktformularen, indsamler vi navn, email, telefonnummer og din besked. Vi
              indsamler ikke CPR-nummer og beder ikke om helbredsdata som et fast felt. Skriver du
              selv om skader eller helbred i fritekst, behandles det kun for at kunne svare og
              tilrettelægge træning.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              3. Formål
            </h2>
            <p>
              Oplysningerne bruges til at besvare din henvendelse, bekræfte eller aftale træning
              og levere den ydelse, du har bedt om. Vi bruger ikke oplysningerne til nyhedsbreve
              eller markedsføring, medmindre du selv beder om det.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              4. Retsgrundlag
            </h2>
            <p>
              Behandlingen sker for at kunne opfylde eller forberede en aftale med dig (GDPR art.
              6, stk. 1, litra b). Eventuel fritekst om helbred behandles kun, hvis det er
              nødvendigt for at levere træningen, og du selv har givet oplysningen.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              5. Databehandlere og videregivelse
            </h2>
            <p>
              Booking- og kontaktforespørgsler sendes som e-mail til {siteConfig.trainer}. E-mailen
              sendes med Resend som databehandler. Resend er en amerikansk udbyder, så oplysninger
              kan blive behandlet uden for EU/EØS. Resend tilbyder databehandleraftale.
            </p>
            <p className="mt-3">
              Hvis der er tilkoblet en database, gemmes de samme oplysninger også i PostgreSQL hos
              den udbyder, der er valgt til hosting. Uden database sendes kun e-mail. Vi sælger
              ikke dine data, og vi deler dem ikke med andre, medmindre det er nødvendigt for at
              levere træningen, eller vi er forpligtet ved lov.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              6. Opbevaring
            </h2>
            <p>
              E-mails opbevares i indbakken, så henvendelsen kan besvares og træningen kan
              gennemføres. Databaseposter (hvis de findes) opbevares med samme formål. Når
              henvendelsen er afsluttet, og der ikke længere er et praktisk behov, slettes
              oplysningerne efter anmodning eller i almindelig oprydning. Skriv til{" "}
              {siteConfig.links.email} for indsigt eller sletning.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              7. Cookies
            </h2>
            <p>
              Siden bruger ikke analyse-, reklame- eller tracking-cookies. Hostingudbyderen kan
              sætte teknisk nødvendige cookies for at levere siden sikkert. Hvis der registreres
              klik eller formularer, sker det lokalt i browseren uden tredjepartscookies og uden at
              sende data til analysevirksomheder.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              8. Dine rettigheder
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
