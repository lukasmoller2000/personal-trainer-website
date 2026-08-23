import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";

const steps = [
  {
    number: "01",
    title: "Vælg din løsning",
    text: "Start med personlig træning eller Online Coaching – alt efter hvad der passer bedst til dig.",
  },
  {
    number: "02",
    title: "Vi finder dine mål",
    text: "Vi tager udgangspunkt i dig, din hverdag og det, du gerne vil opnå.",
  },
  {
    number: "03",
    title: "Du får en plan",
    text: "Du får en konkret plan, så du altid ved, hvad næste skridt er.",
  },
  {
    number: "04",
    title: "Vi følger op",
    text: "Vi følger din udvikling, laver justeringer og sørger for, at du bliver ved med at rykke dig.",
  },
];

export function HowItWorks() {
  return (
    <AnimatedSection className="bg-ink text-cream">
      <div className="container-custom">
        <SectionHeading
          light
          eyebrow="Sådan virker det"
          title="Sådan kommer du i gang"
          description="Du vælger den løsning, der passer til dine mål. Jeg sørger for planen, strukturen og opfølgningen."
        />

        <ol className="grid grid-cols-1 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;

            return (
              <li
                key={step.number}
                className="relative flex gap-5 lg:block"
              >
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-[1.15rem] top-11 w-px bg-[#b4dc24]/30 lg:hidden"
                  />
                )}
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-16 right-[-1.25rem] top-[1.4rem] hidden h-px bg-[#b4dc24]/30 lg:block"
                  />
                )}

                <p className="relative z-[1] shrink-0 font-display text-4xl font-semibold tracking-tight text-[#b4dc24] md:text-5xl">
                  {step.number}
                </p>

                <div
                  className={
                    isLast
                      ? "min-w-0 pt-1 lg:pt-5"
                      : "min-w-0 pb-10 pt-1 lg:pb-0 lg:pt-5"
                  }
                >
                  <div className="mb-3 h-px w-7 bg-sage" />
                  <h3 className="font-display text-xl font-extrabold italic uppercase tracking-tight text-white lg:text-[1.35rem] xl:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-white/60">{step.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </AnimatedSection>
  );
}
