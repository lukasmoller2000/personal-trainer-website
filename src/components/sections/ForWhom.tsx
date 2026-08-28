"use client";

import { motion } from "framer-motion";
import { AnimatedSection } from "@/components/ui/AnimatedSection";

const audiences = [
  {
    number: "01",
    title: "Byg muskler",
    text: "Få et struktureret program med progression, god teknik og fokus på resultater.",
  },
  {
    number: "02",
    title: "Tab fedt",
    text: "Få en realistisk plan, der hjælper dig med at tabe fedt uden ekstreme løsninger.",
  },
  {
    number: "03",
    title: "Kom i bedre form",
    text: "Bliv stærkere, få mere energi og byg en krop, du er stolt af.",
  },
  {
    number: "04",
    title: "Få struktur",
    text: "Slip for at gætte dig frem. Du får en klar plan og en træner, der holder dig på sporet.",
  },
];

export function ForWhom() {
  return (
    <AnimatedSection className="bg-ink text-cream">
      <div className="container-custom">
        <div className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
          <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.22em] text-sage">
            Målgruppe
          </span>
          <h2 className="font-display text-4xl font-extrabold italic tracking-tight text-white text-balance sm:text-5xl md:text-6xl">
            Hvad vil du opnå?
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/70 md:text-lg">
            Uanset om du vil bygge muskler, tabe fedt eller bare komme i bedre form, laver vi en
            plan, der passer til dig og din hverdag.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {audiences.map((item) => (
            <motion.article
              key={item.number}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="group rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 transition-colors duration-300 hover:border-sage/40 md:p-8"
            >
              <div className="mb-5 h-px w-8 bg-sage transition-all duration-300 group-hover:w-14" />
              <p className="font-display text-sm font-semibold tracking-[0.18em] text-sage">
                {item.number}
              </p>
              <h3 className="mt-3 font-display text-2xl font-extrabold italic tracking-tight text-white uppercase md:text-[1.75rem]">
                {item.title}
              </h3>
              <p className="mt-3 max-w-md leading-relaxed text-white/60">{item.text}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
