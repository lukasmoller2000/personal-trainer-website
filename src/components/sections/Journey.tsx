import Image from "next/image";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { journeyStages } from "@/lib/journey";

export function Journey() {
  return (
    <AnimatedSection className="bg-cream">
      <div className="container-custom">
        <SectionHeading
          eyebrow="Min træning"
          title="Jeg startede ikke her."
          description="Det, du ser i dag, er træning over tid — fejl, justeringer og uger, der blev holdt. Den erfaring tager jeg med ind i arbejdet med dig. Ikke som et løfte om, at din krop kommer til at ligne min. Som et ærligt udgangspunkt: vi bygger det, der kan holde."
        />
        <ul className="grid gap-5 sm:grid-cols-3">
          {journeyStages.map((stage) => (
            <li key={stage.src}>
              <figure>
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink">
                  <Image
                    src={stage.src}
                    alt={stage.alt}
                    fill
                    className="object-cover object-top"
                    sizes="(min-width: 1024px) 20rem, (min-width: 640px) 30vw, 100vw"
                  />
                </div>
                <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                  {stage.label}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </AnimatedSection>
  );
}
