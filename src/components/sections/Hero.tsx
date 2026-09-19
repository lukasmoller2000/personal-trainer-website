"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { SiteVideo } from "@/components/ui/SiteVideo";
import { siteConfig } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

/** Official lockup; leftover plate faded in CSS. Intrinsic 891×179. */
const HERO_LOGO = {
  src: "/images/lukas-moller-logo.png",
  width: 891,
  height: 179,
} as const;

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="hero-ambient pointer-events-none absolute inset-0" />

      <div className="container-custom relative grid min-h-[100svh] items-center gap-14 pt-28 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-20 lg:pt-32 lg:pb-24 xl:gap-24">
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          animate="show"
          transition={{ staggerChildren: reduceMotion ? 0 : 0.08, delayChildren: reduceMotion ? 0 : 0.08 }}
          className="max-w-xl xl:max-w-2xl"
        >
          <motion.div variants={fadeUp} className="mb-10 md:mb-12">
            <div className="hero-logo-lockup">
              <Image
                src={HERO_LOGO.src}
                alt={`${siteConfig.name} — ${siteConfig.role}`}
                width={HERO_LOGO.width}
                height={HERO_LOGO.height}
                priority
                quality={90}
                sizes="(min-width: 768px) 360px, 280px"
                className="h-12 w-auto max-w-[min(100%,280px)] bg-transparent object-contain object-left sm:h-14 sm:max-w-[320px] md:h-16 md:max-w-[360px]"
              />
            </div>
            <p className="mt-5 text-[11px] font-semibold tracking-[0.22em] text-white/50 uppercase sm:mt-6">
              Personlig træner i Viborg
            </p>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display max-w-full text-[1.7rem] font-extrabold italic uppercase leading-[0.92] tracking-tight min-[400px]:text-[1.9rem] sm:text-[2.35rem] md:text-[2.6rem] lg:text-[2.75rem] xl:text-[2.95rem]"
          >
            Muskelopbygning,
            <span className="mt-2 block">Styrke</span>
            <span className="mt-2 block text-sage">og fedttab</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-10 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg md:mt-12 md:text-xl md:leading-relaxed"
          >
            Jeg hjælper dig med målrettet træning — 1:1 i{" "}
            <a
              href={siteConfig.gymUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-sage transition-colors hover:text-moss"
            >
              {siteConfig.venue}
            </a>{" "}
            eller online coaching, hvis du træner selv. Klar plan, struktur og løbende opfølgning.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-12"
          >
            <Button
              href="/booking?produkt=session"
              size="lg"
              trackEvent="pt_cta_clicked"
              className="group min-h-12 px-7 text-[13px] font-semibold tracking-[0.14em] uppercase"
            >
              Book personlig træning
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              href="/kontakt"
              variant="light"
              size="lg"
              className="min-h-12 px-7 text-[13px] font-semibold tracking-[0.14em] uppercase"
            >
              Tag en uforpligtende snak
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1], delay: reduceMotion ? 0 : 0.18 }}
          className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
        >
          <div className="absolute -inset-3 rounded-[2.2rem] border border-sage/15 lg:-inset-5" />
          <div className="absolute -right-6 top-10 hidden h-28 w-px bg-sage/35 lg:block" />
          <div className="relative overflow-hidden rounded-[1.75rem] ring-1 ring-white/10">
            <SiteVideo
              src="/videos/discipline.mp4"
              poster="/images/lukas-training.jpg"
              className="aspect-[4/5] max-h-[78vh]"
              videoClassName="object-cover object-[center_20%]"
              playOnClick
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
            <p className="pointer-events-none absolute bottom-6 left-6 font-display text-3xl font-extrabold italic uppercase tracking-tight text-white md:text-4xl">
              1:1
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
