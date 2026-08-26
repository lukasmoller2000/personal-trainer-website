import type { Metadata } from "next";
import Image from "next/image";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { SiteVideo } from "@/components/ui/SiteVideo";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { GymLogo } from "@/components/layout/GymLogo";
import { siteConfig } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/om", {
  title: "Om",
  description: `Mød ${siteConfig.trainer} — personlig træner i ${siteConfig.venue}. Book PT til 350 kr. eller start Online Coaching fra 799 kr./md.`,
});

const philosophy = [
  {
    title: "Ærlighed",
    text: "Ingen mirakelkure. Vi træner det, der virker, og dropper det, der bare ser godt ud.",
  },
  {
    title: "Kontinuitet",
    text: "Resultater kommer af uger, der kan holdes. Programmet skal passe til dit liv — ikke omvendt.",
  },
  {
    title: "Teknik først",
    text: "Vi bygger styrke på bevægelser, du kan stole på, så du kan træne uden unødige skader.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-ink pt-40 pb-24 text-white md:pt-48 md:pb-32">
        <div className="container-custom">
          <div className="max-w-2xl">
            <p className="mb-8 text-xs font-semibold tracking-[0.22em] text-sage uppercase">
              Lukas Møller · Personlig træner · Viborg
            </p>
            <h1 className="font-display text-[2.85rem] font-extrabold italic uppercase leading-[0.92] tracking-tight sm:text-6xl md:text-7xl">
              Jeg ved, hvad der
              <span className="mt-2 block text-sage">skal til.</span>
            </h1>
            <p className="mt-10 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg md:mt-12 md:text-xl">
              Jeg har selv brugt mange år på at lære, hvad der virker. Nu hjælper jeg dig med at
              gøre det samme – med en klar plan, struktur og personlig opfølgning.
            </p>
          </div>
        </div>
      </section>

      <AnimatedSection className="bg-[#eadfce] pb-10 md:pb-12 lg:pb-14">
        <div className="container-custom grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="relative aspect-[473/922] self-start overflow-hidden rounded-2xl bg-ink">
            <Image
              src="/images/lukas-portrait.png"
              alt={`${siteConfig.trainer}, personlig træner i ${siteConfig.venue}`}
              fill
              className="object-cover object-top"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          <div>
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">
              Hvem
            </span>
            <h2 className="font-display text-3xl font-extrabold italic tracking-tight text-ink sm:text-4xl md:text-5xl">
              Jeg hedder Lukas.
              <span className="mt-1 block">
                Jeg hjælper dig med at bygge en{" "}
                <span className="text-sage">hverdag, der holder</span>.
              </span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-ink/65 md:text-lg">
              Jeg arbejder med personlig træning og online coaching med fokus på styrke, fedttab og
              en træningshverdag, der faktisk fungerer i praksis.
            </p>
            <p className="mt-4 text-base leading-relaxed text-ink/65 md:text-lg">
              Uanset om du træner sammen med mig i Viborg Fitness Gym eller følger et online forløb,
              får du en klar plan, løbende opfølgning og hjælp til at holde kursen.
            </p>
            <p className="mt-6 leading-relaxed text-ink/65">
              Du kan booke én personlig træning til 350 kr. eller få løbende hjælp gennem Online
              Coaching.
            </p>
            <div className="mt-10 mb-6 flex items-center gap-3">
              <GymLogo size={56} />
              <a
                href={siteConfig.gymUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-ink hover:text-sage"
              >
                {siteConfig.venue}
                <span className="block text-ink/50">{siteConfig.address}</span>
              </a>
            </div>
            <SocialLinks />
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-ink">
        <div className="container-custom">
          <SectionHeading
            light
            eyebrow="Min rejse"
            title="Det her er ikke bare teori."
            description="Jeg har selv lagt timerne i gymmet, lavet fejlene og fundet ud af, hvad der faktisk virker. Nu bruger jeg den erfaring til at hjælpe dig med at gøre det samme — bare med en klarere vej."
          />
          <SiteVideo
            src="/videos/min-rejse.mp4"
            poster="/images/from-boy-to-beast.jpg"
            className="mx-auto max-w-md rounded-[2rem]"
            videoClassName="aspect-[9/16] object-cover object-center"
            playOnClick
            controls
          />
          <Image
            src="/images/from-boy-to-beast.jpg"
            alt={`${siteConfig.trainer}: From boy to beast — egen transformation`}
            width={1600}
            height={800}
            className="mt-6 h-auto w-full rounded-2xl"
            sizes="(min-width: 1024px) 72rem, 100vw"
          />
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-sand/50">
        <div className="container-custom">
          <SectionHeading eyebrow="Filosofi" title="Sådan arbejder jeg" />
          <div className="grid gap-8 md:grid-cols-3">
            {philosophy.map((item) => (
              <div key={item.title} className="border-t border-ink/10 pt-5">
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 leading-relaxed text-ink/65">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection>
        <div className="container-custom grid items-start gap-14 md:grid-cols-2 md:gap-16 lg:gap-20">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Hvordan træningen foregår
            </h2>
            <div className="mt-8 flex items-start gap-5">
              <GymLogo size={72} />
              <p className="leading-relaxed text-ink/65">
                Vi mødes i{" "}
                <a
                  href={siteConfig.gymUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline decoration-sage/50 underline-offset-4 hover:text-sage"
                >
                  Viborg Fitness Gym
                </a>
                , Falkevej 16B. Træningen foregår 1:1 og tager udgangspunkt i dine mål, dit niveau og
                det, du gerne vil opnå.
              </p>
            </div>
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
              En plan, der passer til dig
            </h2>
            <p className="mt-8 leading-relaxed text-ink/65">
              Du får en klar plan for din træning og ved, hvad du skal arbejde med. Vi følger din
              udvikling og justerer undervejs, så planen fortsat passer til dig og din hverdag.
            </p>
            <Button href="/booking" className="mt-10">
              Book personlig træning
            </Button>
          </div>
        </div>
      </AnimatedSection>

      <CtaBanner />
    </>
  );
}
