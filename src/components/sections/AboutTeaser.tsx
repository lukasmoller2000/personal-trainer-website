import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { GymInstagramLink, SocialLinks } from "@/components/layout/SocialLinks";
import { GymLogo } from "@/components/layout/GymLogo";
import { siteConfig } from "@/lib/utils";

export function AboutTeaser() {
  return (
    <AnimatedSection className="bg-[#eadfce] pb-10 md:pb-12 lg:pb-14">
      <div className="container-custom grid items-start gap-8 lg:grid-cols-[auto_1fr] lg:gap-10">
        <figure className="relative m-0 mx-auto h-[180px] w-[160px] shrink-0 self-start overflow-hidden rounded-2xl bg-ink lg:mx-0 lg:h-[165px] lg:w-[130px] lg:justify-self-start">
          <Image
            src="/images/lukas-portrait.png"
            alt={`${siteConfig.trainer}, personlig træner i ${siteConfig.venue}`}
            fill
            className="object-cover object-[center_24%]"
            sizes="(min-width: 1024px) 130px, 160px"
          />
        </figure>
        <div className="min-w-0">
          <SectionHeading
            align="left"
            eyebrow="Om træneren"
            title={siteConfig.trainer}
            description={`Jeg er personlig træner i ${siteConfig.venue}. Jeg har selv lært at komme hertil — og jeg kan vise dig vejen.`}
          />
          <p className="mb-4 leading-relaxed text-ink/65">
            Jeg har over 12 års erfaring med styrketræning og bruger den erfaring til at gøre
            træningen enkel, målrettet og realistisk. Fokus er på teknik, progression og en plan,
            der passer til dit niveau og dine mål.
          </p>
          <div className="mb-6 flex items-center gap-3">
            <GymLogo size={56} />
            <div>
              <a href={siteConfig.gymUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink hover:text-sage">
                {siteConfig.venue}
                <span className="block text-ink/50">Træningssted: {siteConfig.address}</span>
              </a>
              <GymInstagramLink className="mt-1 block text-sm text-ink/50 hover:text-sage" />
            </div>
          </div>
          <div className="mb-8">
            <SocialLinks />
          </div>
          <Button href="/om" variant="outline">
            Læs mere
          </Button>
        </div>
      </div>
    </AnimatedSection>
  );
}
