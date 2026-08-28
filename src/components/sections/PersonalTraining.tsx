import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductCard } from "@/components/sections/ProductCard";
import { Button } from "@/components/ui/Button";
import { sessionDuration } from "@/lib/commerce";
import { sessionProducts } from "@/lib/products";

export function PersonalTraining() {
  return (
    <AnimatedSection id="personlig-traening" className="scroll-mt-28 bg-cream">
      <div className="container-custom">
        <SectionHeading
          className="max-w-3xl"
          eyebrow="Personlig træning"
          title="1:1 i Viborg — teknik, styrke og en plan, du kan følge"
          description="En session er ikke bare 60 minutter i gymmet. Vi bruger tiden på teknik, styrke, gennemgang og at få dig rigtigt i gang, så du ved, hvad du skal gøre bagefter."
        />

        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
          {sessionProducts().map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-ink/55">
          {sessionDuration.copy} {sessionDuration.notAPromise}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/booking?produkt=session" trackEvent="pt_cta_clicked">
            Book personlig træning
          </Button>
          <Button href="/ydelser#personlig-traening" variant="outline">
            Se personlig træning
          </Button>
        </div>
      </div>
    </AnimatedSection>
  );
}
