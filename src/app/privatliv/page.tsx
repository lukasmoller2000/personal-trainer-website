import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { siteConfig } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";
import { getCompanyConfig, isPaymentsEnabledByFlag } from "@/lib/commerce";

export const metadata: Metadata = pageSeo("/privatliv", {
  title: "Privatlivspolitik",
  description: "Hvordan Lukas Møller behandler personoplysninger.",
});

export default function PrivacyPage() {
  const company = getCompanyConfig();
  const paymentsEnabled = isPaymentsEnabledByFlag();

  return (
    <>
      <PageHero eyebrow="Jura" title="Privatlivspolitik" description="Senest opdateret: september 2026" />
      <AnimatedSection>
        <div className="container-custom max-w-3xl space-y-8 leading-relaxed text-ink/75">
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              1. Dataansvarlig
            </h2>
            <p>
              {company.name} ({company.tradeName}) er dataansvarlig for de personoplysninger, du
              giver via hjemmesiden, herunder kontaktformular og bookingforespørgsler.
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
              Email: {company.email}
              <br />
              Telefon: {siteConfig.links.phone}
            </p>
            <p className="mt-3">
              Personlig træning foregår i {siteConfig.venue}, {siteConfig.address} (træningssted —
              ikke nødvendigvis virksomhedens forretningsadresse).
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              2. Nuværende behandling
            </h2>
            <p>
              Siden kører i dag som forespørgsel og kontakt — ikke som en aktiv webshop med
              kortbetaling.
            </p>
            <p className="mt-3">
              Når du skriver via kontaktformularen, indsamler vi navn, email, telefonnummer og din
              besked. Når du sender en bookingforespørgsel, indsamler vi navn, email, telefonnummer,
              dit mål og eventuelle bemærkninger. Ved enkelt PT kan du også angive et ønsket dato og
              tidspunkt. Det er et ønske, ikke en bekræftet reservation.
            </p>
            <p className="mt-3">
              Vi indsamler ikke CPR-nummer og beder ikke om helbredsoplysninger. Skriver du selv
              noget i fritekst, bruges det kun til at svare dig og tilrettelægge det praktiske.
              Fødselsår indsamles kun, hvis det senere er slået til af moms-hensyn.
            </p>
            <p className="mt-3">
              Henvendelser sendes med Resend som e-mail, så Lukas kan svare. Notifikationer lander i
              den Gmail-indbakke, der er sat som kontaktmail. Hjemmesiden hostes hos Vercel, som kan
              behandle tekniske oplysninger (fx IP-adresse og serverlogs), der er nødvendige for at
              vise siden. Hvis en database er tilkoblet, kan forespørgsler og kontaktbeskeder også
              gemmes der. Uden database sendes henvendelser kun som e-mail.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              3. Fremtidig betaling
            </h2>
            {paymentsEnabled ? (
              <p>
                Kortbetaling sker hos Stripe. Vi modtager betalingsstatus, session-id og
                betalings-id. Vi gemmer ikke kortnummer, udløb eller CVC. Stripe er selvstændig
                dataansvarlig/databehandler for selve kortoplysningerne.
              </p>
            ) : (
              <p>
                Kortbetaling via Stripe er ikke slået til. Køb gennemføres derfor ikke på siden.
                Hvis betaling senere aktiveres, vil Stripe behandle kortoplysninger. Vi gemmer ikke
                kortnummer, udløb eller CVC. Stripe vil i så fald være selvstændig
                dataansvarlig/databehandler for selve kortoplysningerne, og vi kan desuden
                behandle betalingsstatus, session-id og betalings-id for at knytte betalingen til
                din booking.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              4. Formål
            </h2>
            <p>
              Oplysningerne bruges til at besvare din henvendelse og følge op på
              bookingforespørgsler. Hvis en database er tilkoblet, bruges den til at holde styr på
              forespørgsler og — ved et aktivt klippekort — saldo og booking-link knyttet til din
              mail. Vi bruger ikke oplysningerne til nyhedsbreve, medmindre du selv beder om det.
            </p>
            {!paymentsEnabled ? (
              <p className="mt-3">
                Hvis kortbetaling senere slås til, vil oplysningerne også kunne bruges til at
                gennemføre køb, sende betalingsbekræftelse og dokumentere betaling.
              </p>
            ) : (
              <p className="mt-3">
                Oplysningerne bruges også til at gennemføre køb, sende bekræftelse og dokumentere
                betaling.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              5. Retsgrundlag
            </h2>
            <p>
              Behandlingen sker for at opfylde eller forberede en aftale med dig (GDPR art. 6, stk.
              1, litra b) og for bogføring, hvor det er påkrævet (art. 6, stk. 1, litra c).
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              6. Databehandlere og videregivelse
            </h2>
            <p>
              Hjemmesiden hostes hos Vercel. E-mail sendes med Resend og lander i Gmail, så
              henvendelsen kan besvares. Database (hvis tilkoblet) er PostgreSQL hos den tilkoblede
              udbyder.
              {paymentsEnabled
                ? " Betaling behandles af Stripe."
                : " Stripe bruges kun, hvis kortbetaling senere aktiveres."}{" "}
              Vercel, Resend og Google er udbydere uden for eller med behandling uden for EU/EØS.
              De tilbyder databehandleraftaler.
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
              Oplysninger opbevares, så henvendelsen kan besvares, og så en eventuel træning kan
              gennemføres. Bogføringsrelevante oplysninger kan opbevares i den periode, loven
              kræver. Når der ikke længere er et praktisk eller retligt behov, slettes
              oplysningerne efter anmodning eller i almindelig oprydning. Skriv til{" "}
              {company.email} for indsigt eller sletning.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              8. Cookies og måling
            </h2>
            <p>
              Siden bruger ikke analyse-, reklame- eller tracking-cookies. Der er ingen
              Instagram-embeds. Interne knaphændelser (fx at en booking er startet) sker som
              first-party CustomEvent i din browser og sendes ikke til annonce- eller
              analyseselskaber. Hostingudbyderen kan sætte teknisk nødvendige cookies. Admin-login
              bruger en httpOnly-cookie, som kun sættes, hvis nogen er logget ind som admin.
              {!paymentsEnabled
                ? " Stripe-cookies på en betalingsside er først relevante, hvis kortbetaling senere aktiveres."
                : " Stripe kan sætte cookies på deres betalingsside."}
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              9. Dine rettigheder
            </h2>
            <p>
              Du kan bede om indsigt, berigtigelse, sletning, begrænsning, dataportabilitet og
              gøre indsigelse. Skriv til {company.email}. Du kan også klage til
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
