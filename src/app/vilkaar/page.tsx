import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { pageSeo } from "@/lib/seo";
import { getTermsCopy } from "@/lib/legal";

export const metadata: Metadata = pageSeo("/vilkaar", {
  title: "Handelsbetingelser",
  description:
    "Betingelser for personlig træning, klippekort og Online Coaching hos Lukas Møller.",
});

export default function TermsPage() {
  const terms = getTermsCopy();

  return (
    <>
      <PageHero
        eyebrow="Jura"
        title="Handelsbetingelser"
        description="Senest opdateret: september 2026"
      />
      <AnimatedSection>
        {/* LEGAL_PENDING: Review with Lukas before live Stripe payments. */}
        <div className="container-custom max-w-3xl space-y-8 leading-relaxed text-ink/75">
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              1. Virksomheden
            </h2>
            <p>
              Personlig træning og de øvrige ydelser på siden købes af {terms.companyName} (
              {terms.tradeName}).
            </p>
            <p className="mt-3">
              {terms.companyName}
              <br />
              {terms.tradeName}
            </p>
            {terms.cvr ? <p className="mt-3">CVR: {terms.cvr}</p> : null}
            {terms.address ? <p className="mt-3">{terms.address}</p> : null}
            <p className="mt-3">
              Email: {terms.email}
              <br />
              Telefon: {terms.phone}
            </p>
            <p className="mt-3">
              Personlig træning foregår i {terms.trainingVenue}, {terms.trainingAddress}{" "}
              (træningssted — ikke nødvendigvis virksomhedens forretningsadresse).
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              2. Aftalen
            </h2>
            <p>{terms.inquiryNotAgreement}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              3. Priser og betaling
            </h2>
            <p>{terms.prices}</p>
            <p className="mt-3">{terms.payment}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              4. Booking
            </h2>
            <p>{terms.booking}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              5. Aflysning og ombooking
            </h2>
            <p>{terms.cancellation}</p>
            <p className="mt-3">{terms.lateCancel}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              6. Udeblivelse
            </h2>
            <p>{terms.noShow}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              7. Klippekort
            </h2>
            <p>{terms.clipCard}</p>
            <p className="mt-3">{terms.clipExpiry}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              8. Refundering
            </h2>
            <p>{terms.refund}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              9. Forbrugeraftaler og fortrydelse
            </h2>
            <p>{terms.withdrawal}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              10. Online Coaching
            </h2>
            <p>{terms.online}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              11. Sessionens varighed
            </h2>
            <p>{terms.sessionDuration}</p>
            <p className="mt-3">{terms.sessionNotAPromise}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              12. Ansvar
            </h2>
            <p>{terms.liability}</p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-2xl font-semibold tracking-tight text-ink">
              13. Kontakt
            </h2>
            <p>
              Spørgsmål til aftalen, aflysning eller opsigelse sendes til:
              <br />
              {terms.email}
              <br />
              {terms.phone}
            </p>
          </section>
        </div>
      </AnimatedSection>
    </>
  );
}
