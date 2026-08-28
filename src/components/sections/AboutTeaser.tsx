import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { GymLogo } from "@/components/layout/GymLogo";
import { siteConfig } from "@/lib/utils";

export function AboutTeaser() {
  return (
    <AnimatedSection className="bg-[#eadfce] pb-10 md:pb-12 lg:pb-14">
      <div className="container-custom grid items-start gap-12 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20">
        <div className="mx-auto w-full max-w-xs self-start sm:max-w-sm lg:mx-0 lg:max-w-none">
          <div className="relative aspect-[473/922] overflow-hidden rounded-2xl bg-ink">
            <Image
              src="/images/lukas-portrait.png"
              alt={`${siteConfig.trainer}, personlig træner i ${siteConfig.venue}`}
              fill
              className="object-cover object-top"
              sizes="(min-width: 1024px) 38vw, (min-width: 640px) 24rem, 85vw"
            />
          </div>
        </div>
        <div>
          <SectionHeading
            align="left"
            eyebrow="Min rejse"
            title={siteConfig.trainer}
            description="År i gymmet har lært mig, at struktur, teknik, progression og kontinuitet er det, der flytter noget. Det er det, jeg tager med ind i arbejdet med dig — ikke et løfte om, at din krop kommer til at ligne min."
          />
          <p className="mb-4 leading-relaxed text-ink/65">
            Personlig træning i {siteConfig.venue}: 300 kr. for én session, eller 1.350 kr. for 5
            træninger (270 kr. pr. træning). Online Coaching: 799 kr./md.
          </p>
          <div className="mb-6 flex items-center gap-3">
            <GymLogo size={56} />
            <a href={siteConfig.gymUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink hover:text-sage">
              {siteConfig.venue}
              <span className="block text-ink/50">{siteConfig.address}</span>
            </a>
          </div>
          <div className="mb-8">
            <SocialLinks />
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <Button href="/om" variant="outline">
              Læs mere
            </Button>
            <Button href="/booking?produkt=session" trackEvent="pt_cta_clicked">
              Book personlig træning
            </Button>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
