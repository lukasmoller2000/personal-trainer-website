import { LayoutList, MessageSquare, Target, TrendingUp } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";

const values = [
  {
    icon: LayoutList,
    title: "Individuel plan",
    text: "Træningen bygges op efter dine mål, dit niveau og den uge, du faktisk har.",
  },
  {
    icon: MessageSquare,
    title: "Professionel vejledning",
    text: "1:1-sessioner med teknik, tempo og feedback — uden hold og uden støj.",
  },
  {
    icon: Target,
    title: "Struktur og progression",
    text: "Du ved, hvad I træner, hvorfor I træner det, og hvad næste skridt er.",
  },
  {
    icon: TrendingUp,
    title: "Fokus på resultater",
    text: "Planen justeres løbende, så arbejdet bliver ved med at flytte noget.",
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
