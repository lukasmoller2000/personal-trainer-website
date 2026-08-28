import { Check } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { getProduct } from "@/lib/products";
import { formatPrice } from "@/lib/utils";

export function OnlineCoaching() {
  const product = getProduct("online");
  if (!product) return null;

  const price = formatPrice(product.price);

  return (
    <AnimatedSection id="online" className="scroll-mt-28 bg-ink text-cream">
      <div className="container-custom">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <div>
            <SectionHeading
              light
              align="left"
              className="mb-8 md:mb-10"
              eyebrow="Online coaching"
              title="Hvad får du for 799 kr./md.?"
              description={product.description}
            />
            <p className="max-w-xl text-sm leading-relaxed text-white/55">
              Du træner selv — jeg sørger for planen og opfølgningen. Forløbet kører måned for
              måned og opsiges måneden ud. Du sender en forespørgsel; der trækkes ikke automatisk
              betaling.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <Button href="/booking?produkt=online" trackEvent="coaching_cta_clicked">
                Start online coaching
              </Button>
              <Button href="/ydelser#online" variant="light">
                Se online coaching
              </Button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage">
              {product.label}
            </p>
            <p className="mt-3 font-display text-4xl font-extrabold italic tracking-tight text-sage md:text-5xl">
              {price}
              {product.priceSuffix && (
                <span className="text-2xl font-semibold text-white/70">{product.priceSuffix}</span>
              )}
            </p>
            {product.priceNote && (
              <p className="mt-2 text-sm text-white/45">{product.priceNote}</p>
            )}
            <ul className="mt-8 space-y-3">
              {product.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-sm text-white/85 md:text-base">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                  {perk}
                </li>
              ))}
            </ul>
            <Button
              href={`/booking?produkt=${product.id}`}
              trackEvent="coaching_cta_clicked"
              className="mt-8 w-full"
            >
              {product.cta}
            </Button>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
