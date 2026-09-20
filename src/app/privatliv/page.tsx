import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { pageSeo } from "@/lib/seo";
import { companyAddressLines } from "@/lib/commerce";
import { getPrivacyCopy } from "@/lib/legal";

export const metadata: Metadata = pageSeo("/privatliv", {
  title: "Privatlivspolitik",
  description: "Hvordan Lukas Møller behandler personoplysninger.",
});

export default function PrivacyPage() {
  const privacy = getPrivacyCopy();

  return (
    <>
      <PageHero eyebrow="Jura" title="Privatlivspolitik" description="Senest opdateret: september 2026" />
      <AnimatedSection>
        <div className="container-custom max-w-3xl space-y-8 leading-relaxed text-ink/75">
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              1. Dataansvarlig
            </h2>
            <p>{privacy.controller}</p>
            <p className="mt-3">
              {privacy.companyName}
              <br />
              {privacy.cvr ? (
                <>
                  CVR: {privacy.cvr}
                  <br />
                </>
              ) : null}
              {privacy.address ? (
                <>
                  {companyAddressLines(privacy.address).map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                  <br />
                </>
              ) : null}
              Email: {privacy.email}
              <br />
              Telefon: {privacy.phone}
            </p>
            <p className="mt-3">{privacy.venueNote}</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              2. Hvilke oplysninger vi behandler
            </h2>
            <p>{privacy.processingIntro}</p>
            <p className="mt-3">{privacy.contactAndBooking}</p>
            <p className="mt-3">{privacy.noSensitive}</p>
            <p className="mt-3">{privacy.hosting}</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              3. Betaling
            </h2>
            <p>{privacy.payment}</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              4. VFG-medlemskab
            </h2>
            <p>{privacy.membership}</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              5. Formål
            </h2>
            <p>{privacy.purpose}</p>
            <p className="mt-3">{privacy.purposePayment}</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              6. Retsgrundlag
            </h2>
            <p>{privacy.legalBasis}</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              7. Databehandlere og videregivelse
            </h2>
            <p>{privacy.processors}</p>
            <p className="mt-3">{privacy.noSale}</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              8. Opbevaring
            </h2>
            <p>{privacy.retention}</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              9. Cookies og måling
            </h2>
            <p>{privacy.cookies}</p>
          </section>

          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              10. Dine rettigheder
            </h2>
            <p>
              {privacy.rights} (
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
