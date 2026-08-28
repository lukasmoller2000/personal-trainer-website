import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { methodSteps } from "@/lib/method";

export function HowItWorks() {
  return (
    <AnimatedSection className="bg-ink text-cream">
      <div className="container-custom">
        <SectionHeading
          light
          eyebrow="Sådan arbejder jeg"
          title="Mål, plan, træning, opfølgning, resultater"
          description="En enkel ramme — tilpasset dig. Ingen hemmelig metode. Bare struktur, der kan holdes."
        />

        <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 xl:gap-6">
          {methodSteps.map((step, index) => {
            const isLast = index === methodSteps.length - 1;

            return (
              <li key={step.number} className="relative flex gap-5 sm:block">
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-[1.15rem] top-11 w-px bg-sage/30 sm:hidden"
                  />
                )}

                <p className="relative z-[1] shrink-0 font-display text-4xl font-semibold tracking-tight text-sage md:text-5xl">
                  {step.number}
                </p>

                <div
                  className={
                    isLast
                      ? "min-w-0 pt-1 sm:pt-5"
                      : "min-w-0 pb-10 pt-1 sm:pb-8 sm:pt-5 xl:pb-0"
                  }
                >
                  <div className="mb-3 h-px w-7 bg-sage" />
                  <h3 className="font-display text-xl font-extrabold italic uppercase tracking-tight text-white lg:text-[1.35rem]">
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
