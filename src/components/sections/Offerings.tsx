import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductCard } from "@/components/sections/ProductCard";
import { programProducts, sessionProducts } from "@/lib/products";

export function Offerings() {
  return (
    <AnimatedSection id="ydelser">
      <div className="container-custom">
        <SectionHeading
          className="max-w-3xl"
          eyebrow="Ydelser"
          title="Vælg det, der passer til dig"
          description="Uanset om du vil træne 1:1 i Viborg Fitness Gym eller have løbende online coaching, har jeg en løsning, der passer til dit mål."
        />

        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
          {sessionProducts().map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 items-stretch gap-5">
          {programProducts().map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
