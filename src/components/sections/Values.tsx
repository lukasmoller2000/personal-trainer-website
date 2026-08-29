import { LayoutList, MessageSquare, Target, TrendingUp } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";

const values = [
  {
    icon: LayoutList,
    title: "Træning tilpasset dig",
    text: "Dit program tager udgangspunkt i dit niveau, dine mål og den tid, du faktisk har til træning.",
  },
  {
    icon: MessageSquare,
    title: "Personlig coaching",
    text: "Vi træner 1:1 med fokus på teknik, udførelse og at få mest muligt ud af din træning.",
  },
  {
    icon: Target,
    title: "En plan du kan følge",
    text: "Du ved præcis, hvad du skal træne, hvordan du skal gøre det, og hvornår vi justerer.",
  },
  {
    icon: TrendingUp,
    title: "Målbar fremgang",
    text: "Vi følger din udvikling og justerer løbende, så du bliver stærkere og bevæger dig mod dit mål.",
  },
];

export function Values() {
  return (
    <AnimatedSection className="bg-[#eadfce]">
      <div className="container-custom">
        <SectionHeading
          eyebrow="Tilgang"
          title="Personlig træning. Rigtige resultater."
          description="Jeg har selv lært at komme hertil — og jeg kan vise dig, hvordan du gør det samme. 1:1. Ikke et hold."
        />
        <div className="grid gap-px overflow-hidden rounded-[1.75rem] border border-sand bg-sand sm:grid-cols-2">
          {values.map((value) => (
            <div key={value.title} className="bg-cream p-6 md:p-8">
              <value.icon className="mb-4 h-5 w-5 text-ink" strokeWidth={1.75} />
              <h3 className="font-display text-xl font-semibold text-ink">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65 md:text-base">{value.text}</p>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
