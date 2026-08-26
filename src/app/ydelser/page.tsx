import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { products } from "@/lib/products";
import { cn, priceLabel } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/ydelser", {
  title: "Ydelser",
  description:
    "Personlig træning og Online Coaching hos Lukas Møller i Viborg.",
});

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Ydelser"
        title="Vælg det, der passer til dig"
        description="Uanset om du vil træne 1:1 i gymmet eller have løbende online coaching, har jeg en løsning, der passer til dig."
      />

      <section className="section-padding">
        <div className="container-custom space-y-5">
          {products.map((product) => (
            <article
              key={product.id}
              className={cn(
                "grid gap-8 rounded-[1.75rem] border border-sand bg-white p-6 md:grid-cols-[1fr_220px] md:p-8",
                product.emphasis === "featured" && "border-sage ring-1 ring-sage",
                product.emphasis === "premium" && "border-sage/40 bg-ink text-cream"
              )}
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p
                    className={cn(
                      "text-xs font-semibold uppercase tracking-[0.18em]",
                      product.emphasis === "premium" ? "text-sage" : "text-ink/40"
                    )}
                  >
                    {product.label}
                  </p>
                  {product.badge && (
                    <span className="rounded-full bg-sage px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-ink uppercase">
                      {product.badge}
                    </span>
                  )}
                </div>
                <h2
                  className={cn(
                    "mt-2 font-display text-3xl font-extrabold italic tracking-tight",
                    product.emphasis === "premium" ? "text-white" : "text-ink"
                  )}
                >
                  {product.name}
                </h2>
                <p
                  className={cn(
                    "mt-1",
                    product.emphasis === "premium" ? "text-white/50" : "text-ink/50"
                  )}
                >
                  {product.tagline}
                </p>
                <p
                  className={cn(
                    "mt-4 leading-relaxed",
                    product.emphasis === "premium" ? "text-white/70" : "text-ink/70"
                  )}
                >
                  {product.description}
                </p>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {product.perks.map((perk) => (
                    <li
                      key={perk}
                      className={cn(
                        "flex items-start gap-2 text-sm",
                        product.emphasis === "premium" ? "text-white/80" : "text-ink/80"
                      )}
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className={cn(
                  "flex flex-col justify-between gap-6 border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8",
                  product.emphasis === "premium" ? "border-white/10" : "border-sand"
                )}
              >
                <p
                  className={cn(
                    "font-display text-3xl font-extrabold italic tracking-tight",
                    product.emphasis === "premium" ? "text-sage" : "text-ink"
                  )}
                >
                  {priceLabel(product)}
                </p>
                <Button
                  href={`/booking?produkt=${product.id}`}
                  variant={product.emphasis === "simple" ? "secondary" : "primary"}
                  className="w-full"
                >
                  {product.cta}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <HowItWorks />
      <CtaBanner />
    </>
  );
}
