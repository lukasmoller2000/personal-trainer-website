export const STRIPE_DEV_TEST_PRODUCT_ID = "session" as const;
export const STRIPE_DEV_TEST_PACK5_PRODUCT_ID = "pack-5" as const;
export const STRIPE_DEV_TEST_PRODUCT_IDS = [
  STRIPE_DEV_TEST_PRODUCT_ID,
  STRIPE_DEV_TEST_PACK5_PRODUCT_ID,
] as const;

const TEST_CUSTOMER = {
  name: "Stripe Test",
  email: "stripe-test@example.com",
  phone: "11223344",
  goal: "Lokal Stripe-test",
} as const;

export type StripeDevCheckoutProductId = (typeof STRIPE_DEV_TEST_PRODUCT_IDS)[number];

export type StripeDevCheckoutPayload = {
  productId: StripeDevCheckoutProductId;
  earlyPerformanceRequested: true;
  name: string;
  email: string;
  phone: string;
  goal: string;
  date: string;
  time: string;
  birthYear?: number;
};

/** Dummy checkout body for the local test page. Never includes a client amount. */
export function buildStripeDevCheckoutPayload(input: {
  productId?: StripeDevCheckoutProductId;
  date: string;
  time: string;
  birthYear?: number | null;
}): StripeDevCheckoutPayload {
  return {
    productId: input.productId ?? STRIPE_DEV_TEST_PRODUCT_ID,
    earlyPerformanceRequested: true,
    name: TEST_CUSTOMER.name,
    email: TEST_CUSTOMER.email,
    phone: TEST_CUSTOMER.phone,
    goal: TEST_CUSTOMER.goal,
    date: input.date,
    time: input.time,
    ...(input.birthYear != null ? { birthYear: input.birthYear } : {}),
  };
}

/** Accept both historical `{ url }` and `{ checkoutUrl }` checkout responses. */
export function readCheckoutRedirectUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const url = record.url ?? record.checkoutUrl;
  return typeof url === "string" && url.length > 0 ? url : null;
}
