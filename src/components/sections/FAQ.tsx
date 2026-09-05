"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { cancellationConfig, clipCardValidity, sessionDuration } from "@/lib/commerce";
import { cn } from "@/lib/utils";

export const faqs = [
  {
    question: "Hvordan foregår personlig træning?",
    answer: sessionDuration.copy,
  },
  {
    question: "Kan jeg booke bare én træning?",
    answer:
      "Ja. Du kan booke en enkelt personlig træning til 300 kr. uden at binde dig til et forløb. Du kan også købe 5 træninger til 1.350 kr. (270 kr. pr. træning — 150 kr. under 5 enkeltbookinger).",
  },
  {
    question: "Hvad er forskellen på PT og Online Coaching?",
    answer:
      "En personlig træning er én session i gymmet til 300 kr. Du kan også købe 5 træninger til 1.350 kr. Online Coaching er et løbende månedligt forløb med program, kostplan og ugentlige check-ins — 799 kr./md.",
  },
  {
    question: "Hvordan fungerer Online Coaching?",
    answer:
      "Du får et personligt træningsprogram, kostplan og løbende justeringer. Vi tager ugentlige check-ins, og planen tilpasses dine resultater. Forløbet kører måned for måned og opsiges måneden ud.",
  },
  {
    question: "Hvordan virker klippekort?",
    answer:
      `Du kan købe 5 træninger til 1.350 kr. Du vælger ikke tid ved henvendelsen. Når klippekortet er aktivt, booker du tider med dine klip og kan se, hvor mange træninger du har tilbage. Klippekortet gælder ${clipCardValidity.months} måneder fra køb.`,
  },
  {
    question: "Skal jeg være i god form inden?",
    answer:
      "Nej. Planen tilpasses dit niveau. Du skal bare møde op — vi tager det derfra.",
  },
  {
    question: "Hvor foregår træningen?",
    answer:
      "Personlig træning foregår i Viborg Fitness Gym (træningssted: Falkevej 16B, 8800 Viborg).",
  },
  {
    question: "Hvad skal jeg have med?",
    answer:
      "Træningstøj, indendørssko og en vandflaske. Er der noget praktisk, jeg bør vide inden træningen, så skriv det i din henvendelse.",
  },
  {
    question: "Kan jeg ændre min booking?",
    answer:
      `Afbudsreglen på ${cancellationConfig.freeCancelHours} timer gælder for bekræftede tider. Når en tid er bekræftet, kan du aflyse eller flytte senest ${cancellationConfig.freeCancelHours} timer før. Ved senere afbud eller udeblivelse betragtes sessionen som udgangspunkt som brugt — ét klip trækkes, eller betalingen for en enkelt session refunderes som udgangspunkt ikke. En forespørgsel er ikke en bekræftet tid. Online Coaching opsiges måneden ud — skriv eller ring.`,
  },
  {
    question: "Hvordan starter jeg Online Coaching?",
    answer:
      "Du sender en forespørgsel via booking. Du vælger ikke tid i gymmet — opstart aftales, og Lukas kontakter dig.",
  },
  {
    question: "Hvordan betaler jeg?",
    answer:
      "Når online betaling er slået til, betaler du med kort via Stripe, før tiden eller klippekortet gælder. Kortoplysninger gemmes hos Stripe — ikke på siden. Indtil betaling er slået til, sender du en forespørgsel, og jeg vender tilbage med bekræftelse og betalingsinfo (MobilePay, overførsel eller kontant).",
  },
];

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
    <AnimatedSection id="faq">
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
