import Image from "next/image";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { hasTestimonials, testimonials } from "@/lib/testimonials";

export function Testimonials() {
  if (!hasTestimonials()) return null;

  return (
    <AnimatedSection>
      <div className="container-custom">
        <SectionHeading eyebrow="Forløb" title="Det, folk kommer for" />
        <ul className="grid gap-5 md:grid-cols-2">
          {testimonials.map((item) => (
            <li
              key={`${item.name}-${item.quote.slice(0, 24)}`}
              className="rounded-[1.75rem] border border-sand bg-white p-6 md:p-8"
            >
              {item.image && (
                <div className="relative mb-5 h-16 w-16 overflow-hidden rounded-full bg-sand">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              )}
              <blockquote className="leading-relaxed text-ink/75">“{item.quote}”</blockquote>
              <p className="mt-4 font-medium text-ink">{item.name}</p>
              {(item.goal || item.result || item.period) && (
                <p className="mt-1 text-sm text-ink/50">
                  {[item.goal, item.result, item.period].filter(Boolean).join(" · ")}
                </p>
              )}
              {item.beforeImage && item.afterImage && (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-sand">
                    <Image
                      src={item.beforeImage}
                      alt={`${item.name}, før`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 16rem, 45vw"
                    />
                  </div>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-sand">
                    <Image
                      src={item.afterImage}
                      alt={`${item.name}, efter`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 16rem, 45vw"
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </AnimatedSection>
  );
}
