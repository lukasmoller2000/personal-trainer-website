"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { faqs } from "@/lib/faq";
import { cn } from "@/lib/utils";

export { faqs };

export function FAQ({
  limit,
  showHeading = true,
}: {
  limit?: number;
  showHeading?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const items = limit ? faqs.slice(0, limit) : faqs;

  return (
    <AnimatedSection id="faq" className="scroll-mt-28">
      <div className="container-custom max-w-3xl">
        {showHeading && (
          <SectionHeading
            eyebrow="FAQ"
            title="Spørgsmål og svar"
            description="Det, folk typisk spørger om, før de booker."
          />
        )}
        <div className="divide-y divide-sand border-y border-sand">
          {items.map((faq, index) => (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex min-h-14 w-full items-center justify-between gap-4 py-5 text-left"
                aria-expanded={openIndex === index}
                aria-controls={`faq-panel-${index}`}
              >
                <span className="font-medium text-ink">{faq.question}</span>
                <span
                  aria-hidden
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    openIndex === index ? "bg-ink text-cream" : "bg-sand text-ink"
                  )}
                >
                  {openIndex === index ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </span>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    id={`faq-panel-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="pb-5 leading-relaxed text-ink/65">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
