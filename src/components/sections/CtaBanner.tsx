import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

export function CtaBanner() {
  return (
    <AnimatedSection className="relative overflow-hidden bg-ink py-24 md:py-32">
      <div className="absolute inset-0">
        <Image
          src="/images/lukas-front.jpg"
          alt=""
          fill
          className="object-cover object-top opacity-35 grayscale"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-ink/75" />
      </div>
      <div className="container-custom relative z-10 max-w-3xl text-center">
        <p className="mb-4 text-[0.65rem] font-semibold uppercase leading-relaxed tracking-[0.14em] text-sage sm:text-xs sm:tracking-[0.22em]">
          Personlig træning · Online coaching
        </p>
        <h2 className="font-display text-4xl font-extrabold italic uppercase leading-[0.92] tracking-tight text-cream text-balance md:text-6xl">
          Klar til at rykke dig?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-cream/80 md:text-lg">
          Uanset om du vil træne 1:1 eller have løbende online coaching, har jeg en løsning, der
          passer til dine mål.
        </p>
        <div className="mt-8">
          <Button
            href="/booking"
            size="lg"
            className="uppercase tracking-[0.14em]"
          >
            Book nu
          </Button>
        </div>
      </div>
    </AnimatedSection>
  );
}
