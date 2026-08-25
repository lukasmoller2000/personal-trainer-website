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
            eyebrow="Om træneren"
            title={siteConfig.trainer}
            description={`Jeg er personlig træner i ${siteConfig.venue}. Jeg har selv lært at komme hertil — og jeg kan vise dig vejen.`}
          />
          <p className="mb-4 leading-relaxed text-ink/65">
            Book en personlig træning til 350 kr., eller få løbende hjælp gennem Online Coaching.
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
          <Button href="/om" variant="outline">
            Læs mere
          </Button>
        </div>
      </div>
    </AnimatedSection>
  );
}
