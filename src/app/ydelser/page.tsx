import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { products, trackEventForProduct } from "@/lib/products";
import { cn, priceLabel } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/ydelser", {
  title: "Personlig træning og online coaching i Viborg",
  description:
    "PT i Viborg Fitness Gym til 300 kr. pr. session, klippekort til 5 træninger for 1.350 kr., eller online coaching til 799 kr./md.",
});

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Ydelser"
        title="Personlig træning eller online coaching"
        description="PT er 1:1 med mig i Viborg Fitness Gym — enkelt session eller klippekort. Online coaching er til dig, der træner selv — med program, kostplan og opfølgning."
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
                    "mt-4 font-medium",
                    product.emphasis === "premium" ? "text-white/80" : "text-ink/80"
                  )}
                >
                  {product.fits}
                </p>
                <p
                  className={cn(
                    "mt-3 leading-relaxed",
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
                <div className="mt-6">
                  <h3
                    className={cn(
                      "text-xs font-semibold uppercase tracking-[0.16em]",
                      product.emphasis === "premium" ? "text-sage" : "text-ink/40"
                    )}
                  >
                    Sådan foregår det
                  </h3>
                  <ol className="mt-3 space-y-2">
                    {product.how.map((step, index) => (
                      <li
                        key={step}
                        className={cn(
                          "flex gap-3 text-sm leading-relaxed",
                          product.emphasis === "premium" ? "text-white/75" : "text-ink/70"
                        )}
                      >
                        <span className="font-display w-6 shrink-0 font-semibold text-sage">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div
                className={cn(
                  "flex flex-col justify-between gap-6 border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8",
                  product.emphasis === "premium" ? "border-white/10" : "border-sand"
                )}
              >
                <div>
                  <p
                    className={cn(
                      "font-display text-3xl font-extrabold italic tracking-tight",
                      product.emphasis === "premium" ? "text-sage" : "text-ink"
                    )}
                  >
                    {priceLabel(product)}
                  </p>
                  {product.priceNote && (
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        product.emphasis === "premium" ? "text-white/45" : "text-ink/50"
                      )}
                    >
                      {product.priceNote}
                    </p>
                  )}
                </div>
                <Button
                  href={`/booking?produkt=${product.id}`}
                  variant={product.emphasis === "simple" ? "secondary" : "primary"}
                  trackEvent={trackEventForProduct(product.id)}
                  className="w-full"
                >
                  {product.cta}
                </Button>
              </div>
            </article>
          ))}
          <p className="pt-4 text-center text-sm text-ink/55">
            Usikker på hvad der passer?{" "}
            <Link
              href="/kontakt"
              className="font-medium text-ink underline decoration-sage/50 underline-offset-4 hover:text-sage"
            >
              Tag en uforpligtende snak
            </Link>
            .
          </p>
        </div>
      </section>

      <HowItWorks />
      <CtaBanner />
    </>
  );
}
