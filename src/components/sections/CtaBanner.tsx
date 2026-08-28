import Image from "next/image";
import Link from "next/link";
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
          Book 1:1 i Viborg, start online coaching, eller skriv hvis du er i tvivl om hvad der
          passer.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button
            href="/booking?produkt=session"
            size="lg"
            trackEvent="pt_cta_clicked"
            className="uppercase tracking-[0.14em]"
          >
            Book personlig træning
          </Button>
          <Button
            href="/booking?produkt=online"
            variant="light"
            size="lg"
            trackEvent="coaching_cta_clicked"
            className="uppercase tracking-[0.14em]"
          >
            Start online coaching
          </Button>
        </div>
        <p className="mt-5">
          <Link
            href="/kontakt"
            className="text-sm font-medium text-cream/70 underline decoration-sage/40 underline-offset-4 hover:text-sage"
          >
            Kontakt mig
          </Link>
        </p>
      </div>
    </AnimatedSection>
  );
}
