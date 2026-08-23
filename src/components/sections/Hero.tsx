"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { GymLogo } from "@/components/layout/GymLogo";
import { SiteVideo } from "@/components/ui/SiteVideo";
import { siteConfig } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,255,0,0.08),transparent_42%)]" />

      <div className="container-custom relative grid min-h-[100svh] items-center gap-12 pt-28 pb-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:pt-32 lg:pb-20">
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.08, delayChildren: 0.08 }}
          className="max-w-2xl"
        >
          <motion.div variants={fadeUp} className="mb-8 flex items-center gap-4">
            <GymLogo size={56} />
            <p className="text-[11px] font-semibold tracking-[0.22em] text-white/45 uppercase">
              {siteConfig.trainer}
              <span className="mt-1 block text-sage">Personlig træner · 1:1</span>
            </p>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-display text-[2.85rem] font-extrabold italic uppercase leading-[0.92] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.35rem] xl:text-8xl"
          >
            Byg en stærkere
            <span className="mt-2 block text-sage">version af dig selv</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-8 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg md:mt-10 md:text-xl md:leading-relaxed"
          >
            Personlig træning i Viborg med {siteConfig.trainer} hos{" "}
            <a
              href={siteConfig.gymUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-sage transition-colors hover:text-moss"
            >
              {siteConfig.venue}
            </a>
            . Ingen tilfældige træningsplaner – bare målrettet træning, struktur og en plan, der
            passer til dig.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <Button
              href="/booking?produkt=session"
              size="lg"
              className="group min-h-12 px-7 text-[13px] font-semibold tracking-[0.14em] uppercase"
            >
              Book personlig træning
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              href="/booking?produkt=online"
              variant="light"
              size="lg"
              className="min-h-12 px-7 text-[13px] font-semibold tracking-[0.14em] uppercase"
            >
              Start online coaching
            </Button>
            <Button
              href={siteConfig.gymUrl}
              variant="accent"
              size="lg"
              className="min-h-12 px-7 text-[13px] font-semibold tracking-[0.14em] uppercase"
            >
              Viborg Fitness Gym
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
          className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
        >
          <div className="absolute -inset-3 rounded-[2.2rem] border border-sage/20 lg:-inset-4" />
          <div className="absolute -right-6 top-10 hidden h-28 w-px bg-sage/50 lg:block" />
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
