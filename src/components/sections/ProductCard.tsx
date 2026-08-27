import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn, formatPrice } from "@/lib/utils";
import { trackEventForProduct, type Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const price = formatPrice(product.price);
  const premium = product.emphasis === "premium";
  const featured = product.emphasis === "featured";

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col",
        featured && "border-sage ring-1 ring-sage",
        premium && "border-sage/40 bg-ink ring-1 ring-sage/30"
      )}
    >
      {product.badge && (
        <span
          className={cn(
            "absolute top-5 right-5 rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase",
            premium ? "bg-sage text-ink" : "border border-ink/5 bg-sage text-ink"
          )}
        >
          {product.badge}
        </span>
      )}

      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.2em]",
          premium ? "text-sage" : "text-ink/40"
        )}
      >
        {product.label}
      </p>

      <h3
        className={cn(
          "mt-3 pr-28 font-display text-[1.65rem] font-extrabold italic tracking-tight md:text-[1.85rem]",
          premium ? "text-white" : "text-ink"
        )}
      >
        {product.name}
      </h3>

      <p className={cn("mt-2 text-sm font-medium", premium ? "text-white/50" : "text-ink/50")}>
        {product.tagline}
      </p>
      <p className={cn("mt-2 text-sm", premium ? "text-white/70" : "text-ink/65")}>
        {product.fits}
      </p>

      {price ? (
        <div className="mt-6">
          <p
            className={cn(
              "font-display text-4xl font-extrabold italic tracking-tight md:text-[2.5rem]",
              premium ? "text-sage" : "text-ink"
            )}
          >
            {product.pricePrefix}
            {price}
            {product.priceSuffix && (
              <span className="text-2xl font-semibold">{product.priceSuffix}</span>
            )}
          </p>
          {product.priceNote && (
            <p className={cn("mt-1 text-sm", premium ? "text-white/45" : "text-ink/50")}>
              {product.priceNote}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 min-h-[4.5rem]" />
      )}

      <p className={cn("mt-5 leading-relaxed", premium ? "text-white/70" : "text-ink/65")}>
        {product.description}
      </p>

      <ul className="mt-6 flex-1 space-y-2.5">
        {product.perks.map((perk) => (
          <li
            key={perk}
            className={cn("flex items-start gap-2.5 text-sm", premium ? "text-white/80" : "text-ink/80")}
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
            {perk}
          </li>
        ))}
      </ul>

      <Button
        href={`/booking?produkt=${product.id}`}
        variant={premium || featured ? "primary" : "secondary"}
        trackEvent={trackEventForProduct(product.id)}
        size="lg"
        className="mt-8 w-full font-semibold tracking-[0.06em]"
      >
        {product.cta}
      </Button>
    </Card>
  );
}
