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
      <div className="container-custom grid items-start gap-10 md:gap-12 lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] lg:gap-16">
        <figure className="relative m-0 mx-auto w-full min-w-0 max-w-[350px] justify-self-start self-start lg:mx-0 lg:max-w-[380px]">
          <div className="relative h-[330px] overflow-hidden rounded-2xl bg-ink lg:h-[430px]">
            <Image
              src="/images/lukas-portrait.png"
              alt={`${siteConfig.trainer}, personlig træner i ${siteConfig.venue}`}
              fill
              className="object-cover object-[center_36%]"
              sizes="(min-width: 1024px) 380px, 350px"
            />
          </div>
        </figure>
        <div className="min-w-0">
          <SectionHeading
            align="left"
            eyebrow="Om træneren"
            title={siteConfig.trainer}
            description={`Jeg er personlig træner i ${siteConfig.venue}. Jeg har selv lært at komme hertil — og jeg kan vise dig vejen.`}
          />
          <p className="mb-4 leading-relaxed text-ink/65">
            Book en personlig træning til 300 kr., køb 5 træninger til 1.350 kr., eller få løbende
            hjælp gennem Online Coaching til 799 kr./md.
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
