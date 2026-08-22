import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { siteConfig } from "@/lib/utils";

const stats = [
  { value: "+13 år", label: "Erfaring" },
  { value: "1:1", label: "Personlig træning" },
  { value: "350 kr.", label: "Pr. PT" },
  { value: siteConfig.location, label: siteConfig.venue },
];

export function Stats() {
  return (
    <AnimatedSection className="bg-ink pt-0">
      <div className="container-custom">
        <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-forest px-6 py-10 sm:grid-cols-2 lg:grid-cols-4 md:px-10">
          {stats.map((item) => (
            <div key={item.label} className="text-center lg:text-left">
              <p className="font-display text-4xl font-extrabold italic tracking-tight text-sage md:text-5xl">
                {item.value}
              </p>
              <p className="mt-2 text-sm text-white/55">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
}
