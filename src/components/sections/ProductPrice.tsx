import { cn, formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/products";

type ProductPriceSize = "card" | "aside" | "compact";

export function ProductPrice({
  product,
  size = "card",
  premium = false,
  className,
}: {
  product: Product;
  size?: ProductPriceSize;
  premium?: boolean;
  className?: string;
}) {
  const price = formatPrice(product.price);
  if (!price) return null;

  const memberPrice = formatPrice(product.memberPrice);
  const memberLabel = product.memberPriceLabel ?? "VFG-medlem";

  return (
    <div className={className}>
      <p
        className={cn(
          size === "card" &&
            "font-display text-4xl font-extrabold italic tracking-tight md:text-[2.5rem]",
          size === "aside" && "font-display text-3xl font-extrabold italic tracking-tight",
          size === "compact" && "font-medium",
          premium ? "text-sage" : "text-ink"
        )}
      >
        {product.pricePrefix}
        {price}
        {product.priceSuffix && (
          <span className={cn(size === "card" && "text-2xl font-semibold")}>
            {product.priceSuffix}
          </span>
        )}
      </p>
      {product.priceNote && (
        <p
          className={cn(
            size === "compact" ? "mt-0.5 text-xs text-ink/45" : "mt-1 text-sm",
            size !== "compact" && (premium ? "text-white/45" : "text-ink/50")
          )}
        >
          {product.priceNote}
        </p>
      )}
      {memberPrice ? (
        <div className={cn(size === "compact" ? "mt-1.5" : "mt-2.5")}>
          <p className={cn(size === "compact" ? "text-xs leading-snug" : "text-sm leading-snug")}>
            <span className="font-semibold text-sage">{memberLabel}:</span>{" "}
            <span
              className={cn(
                size === "card" && "font-display text-lg font-bold italic tracking-tight",
                size === "aside" && "font-display text-base font-bold italic tracking-tight",
                size === "compact" && "font-medium",
                premium ? "text-sage" : "text-ink"
              )}
            >
              {memberPrice}
            </span>
          </p>
          {product.memberPriceNote ? (
            <p
              className={cn(
                size === "compact" ? "mt-0.5 text-[11px] text-ink/45" : "mt-0.5 text-sm",
                size !== "compact" && (premium ? "text-white/45" : "text-ink/50")
              )}
            >
              {product.memberPriceNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
