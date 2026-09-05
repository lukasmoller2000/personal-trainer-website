/**
 * Stripe TEST-mode only. Live keys are rejected before any client is created.
 * Price IDs come from env — never hardcoded.
 */

export const STRIPE_TEST_SECRET_PREFIX = "sk_test_";
export const STRIPE_LIVE_SECRET_PREFIX = "sk_live_";
export const STRIPE_TEST_PUBLISHABLE_PREFIX = "pk_test_";
export const STRIPE_LIVE_PUBLISHABLE_PREFIX = "pk_live_";

export const STRIPE_LIVE_KEYS_REJECTED =
  "Live Stripe-nøgler er afvist. Kun test-nøgler er tilladt.";
export const STRIPE_TEST_KEYS_MISSING = "Stripe test-nøgler mangler";
export const STRIPE_TEST_KEYS_INVALID = "Stripe-nøglerne er ugyldige. Brug sk_test_ og pk_test_.";

/** Hosted Checkout is always a one-time Payment — never Stripe Billing. */
export const STRIPE_CHECKOUT_MODE = "payment" as const;

export const STRIPE_PRICE_ENV = {
  session: "STRIPE_PRICE_PT_SINGLE",
  "pack-5": "STRIPE_PRICE_PT_5_CLIP",
  online: "STRIPE_PRICE_ONLINE_COACHING",
} as const;

export type CheckoutProductId = keyof typeof STRIPE_PRICE_ENV;

export type StripeKeyKind = "test" | "live" | "invalid" | "missing";

export type ParsedStripeKey =
  | { kind: "test"; key: string }
  | { kind: "live" }
  | { kind: "invalid" }
  | { kind: "missing" };

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function parseStripeSecretKey(raw?: string | null): ParsedStripeKey {
  const key = raw?.trim() ?? "";
  if (!key) return { kind: "missing" };
  if (key.startsWith(STRIPE_LIVE_SECRET_PREFIX)) return { kind: "live" };
  if (key.startsWith(STRIPE_TEST_SECRET_PREFIX) && key.length > STRIPE_TEST_SECRET_PREFIX.length) {
    return { kind: "test", key };
  }
  return { kind: "invalid" };
}

export function parseStripePublishableKey(raw?: string | null): ParsedStripeKey {
  const key = raw?.trim() ?? "";
  if (!key) return { kind: "missing" };
  if (key.startsWith(STRIPE_LIVE_PUBLISHABLE_PREFIX)) return { kind: "live" };
  if (
    key.startsWith(STRIPE_TEST_PUBLISHABLE_PREFIX) &&
    key.length > STRIPE_TEST_PUBLISHABLE_PREFIX.length
  ) {
    return { kind: "test", key };
  }
  return { kind: "invalid" };
}

export function classifyStripeSecretKey(raw?: string | null): StripeKeyKind {
  return parseStripeSecretKey(raw).kind;
}

export function classifyStripePublishableKey(raw?: string | null): StripeKeyKind {
  return parseStripePublishableKey(raw).kind;
}

export function hasLiveStripeKeys() {
  return (
    classifyStripeSecretKey(process.env.STRIPE_SECRET_KEY) === "live" ||
    classifyStripePublishableKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) === "live"
  );
}

export function getStripePriceEnvName(productId: string) {
  if (productId === "session" || productId === "pack-5" || productId === "online") {
    return STRIPE_PRICE_ENV[productId];
  }
  return null;
}

/** Env-mapped Price ID. Never invent or hardcode an ID. */
export function readStripePriceId(productId: string) {
  const envName = getStripePriceEnvName(productId);
  if (!envName) return null;
  const id = readEnv(envName);
  return id || null;
}

export type StripeTestConfig =
  | {
      ok: true;
      secretKey: string;
      publishableKey: string;
      webhookSecret: string;
    }
  | {
      ok: false;
      reason: "live_keys" | "missing_keys" | "invalid_keys";
      error: string;
      missing: string[];
    };

export function evaluateStripeTestConfig(): StripeTestConfig {
  const secret = parseStripeSecretKey(process.env.STRIPE_SECRET_KEY);
  const publishable = parseStripePublishableKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET");

  if (secret.kind === "live" || publishable.kind === "live") {
    return {
      ok: false,
      reason: "live_keys",
      error: STRIPE_LIVE_KEYS_REJECTED,
      missing: [],
    };
  }

  if (secret.kind === "invalid" || publishable.kind === "invalid") {
    return {
      ok: false,
      reason: "invalid_keys",
      error: STRIPE_TEST_KEYS_INVALID,
      missing: [],
    };
  }

  const missing: string[] = [];
  if (secret.kind === "missing") missing.push("STRIPE_SECRET_KEY");
  if (publishable.kind === "missing") missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  if (!webhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");

  if (missing.length > 0 || secret.kind !== "test" || publishable.kind !== "test") {
    return {
      ok: false,
      reason: "missing_keys",
      error: STRIPE_TEST_KEYS_MISSING,
      missing,
    };
  }

  return {
    ok: true,
    secretKey: secret.key,
    publishableKey: publishable.key,
    webhookSecret,
  };
}

function isPaymentsEnabledFlag() {
  const raw = process.env.PAYMENTS_ENABLED?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

/** Dev/test helpers must never run in production and never see live keys. */
export function isStripeDevEndpointAllowed() {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  if (hasLiveStripeKeys()) return false;
  return true;
}

/**
 * Local Stripe Checkout test page. Requires non-production, PAYMENTS_ENABLED,
 * and a valid test-key config. Production / `next start` always 404s.
 */
export function isStripeDevCheckoutTestAllowed() {
  if (!isStripeDevEndpointAllowed()) return false;
  if (!isPaymentsEnabledFlag()) return false;
  return evaluateStripeTestConfig().ok;
}
