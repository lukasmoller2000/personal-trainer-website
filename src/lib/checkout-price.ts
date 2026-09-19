/**
 * Central server-side checkout price resolver.
 * Amounts never come from the client. VFG member prices apply only when
 * membership was verified server-side as ACTIVE.
 */

export const CHECKOUT_CURRENCY = "dkk" as const;

export type PriceTier = "standard" | "vfg_member";

/** Catalog amounts in øre. Online coaching has no member price. */
export const CHECKOUT_AMOUNTS_ORE = {
  session: { standard: 30000, vfg_member: 25000 },
  "pack-5": { standard: 135000, vfg_member: 115000 },
} as const;

export type CheckoutPricedProductId = keyof typeof CHECKOUT_AMOUNTS_ORE;

export type ResolvedCheckoutPrice = {
  productId: CheckoutPricedProductId;
  amountOre: number;
  priceTier: PriceTier;
  currency: typeof CHECKOUT_CURRENCY;
};

export function isCheckoutPricedProductId(productId: string): productId is CheckoutPricedProductId {
  return productId === "session" || productId === "pack-5";
}

export function hasVfgMemberPrice(productId: string) {
  return isCheckoutPricedProductId(productId);
}

/**
 * Server-side checkout amount. `isVfgMember` must be the result of a
 * server lookup — never a client flag. Lookup failure / unverified → standard.
 */
export function resolveCheckoutPrice(input: {
  productId: string;
  isVfgMember?: boolean;
}): ResolvedCheckoutPrice | null {
  if (!isCheckoutPricedProductId(input.productId)) {
    return null;
  }

  const amounts = CHECKOUT_AMOUNTS_ORE[input.productId];
  const member = input.isVfgMember === true;
  const priceTier: PriceTier = member ? "vfg_member" : "standard";
  return {
    productId: input.productId,
    amountOre: member ? amounts.vfg_member : amounts.standard,
    priceTier,
    currency: CHECKOUT_CURRENCY,
  };
}

/** Standard catalog amount. Used when membership is unknown or unverified. */
export function standardCheckoutAmountOre(productId: string) {
  return resolveCheckoutPrice({ productId, isVfgMember: false })?.amountOre ?? null;
}

export function expectedAmountOreForTier(productId: string, priceTier: string, vfgMemberVerified: boolean) {
  return resolveCheckoutPrice({
    productId,
    isVfgMember: priceTier === "vfg_member" && vfgMemberVerified === true,
  })?.amountOre ?? null;
}
