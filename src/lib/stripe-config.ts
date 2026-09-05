/**
 * Stripe TEST by default. LIVE is only accepted in production when
 * STRIPE_MODE=live and matching sk_live_ / pk_live_ keys are present.
 * Development / non-production never accepts live keys.
 * Price IDs come from env — never hardcoded.
 */

export const STRIPE_TEST_SECRET_PREFIX = "sk_test_";
export const STRIPE_LIVE_SECRET_PREFIX = "sk_live_";
export const STRIPE_TEST_PUBLISHABLE_PREFIX = "pk_test_";
export const STRIPE_LIVE_PUBLISHABLE_PREFIX = "pk_live_";

export const STRIPE_LIVE_KEYS_REJECTED =
  "Live Stripe-nøgler er afvist. Kun test-nøgler er tilladt.";
export const STRIPE_TEST_KEYS_IN_LIVE_MODE =
  "Stripe test-nøgler er afvist i live-mode. Brug sk_live_ og pk_live_.";
export const STRIPE_TEST_KEYS_MISSING = "Stripe test-nøgler mangler";
export const STRIPE_LIVE_KEYS_MISSING = "Stripe live-nøgler mangler";
export const STRIPE_TEST_KEYS_INVALID = "Stripe-nøglerne er ugyldige. Brug sk_test_ og pk_test_.";
export const STRIPE_LIVE_KEYS_INVALID = "Stripe-nøglerne er ugyldige. Brug sk_live_ og pk_live_.";

/** Hosted Checkout is always a one-time Payment — never Stripe Billing. */
export const STRIPE_CHECKOUT_MODE = "payment" as const;

/** Create this endpoint in Stripe Dashboard later. Do not auto-create. */
export const STRIPE_PRODUCTION_WEBHOOK_URL = "https://www.lukasmoller.dk/api/stripe/webhook";

export const STRIPE_PRICE_ENV = {
  session: "STRIPE_PRICE_PT_SINGLE",
  "pack-5": "STRIPE_PRICE_PT_5_CLIP",
  online: "STRIPE_PRICE_ONLINE_COACHING",
} as const;

/** Optional live-mode aliases. Used only when getStripeMode() is live. */
export const STRIPE_PRICE_LIVE_ENV = {
  session: "STRIPE_PRICE_LIVE_PT_SINGLE",
  "pack-5": "STRIPE_PRICE_LIVE_PT_5_CLIP",
} as const;

export type CheckoutProductId = keyof typeof STRIPE_PRICE_ENV;

export type StripeKeyKind = "test" | "live" | "invalid" | "missing";

export type StripeMode = "test" | "live";

export type ParsedStripeKey =
  | { kind: "test"; key: string }
  | { kind: "live"; key: string }
  | { kind: "invalid" }
  | { kind: "missing" };

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function hasPrefix(value: string, prefix: string) {
  return value.startsWith(prefix) && value.length > prefix.length;
}

export function parseStripeSecretKey(raw?: string | null): ParsedStripeKey {
  const key = raw?.trim() ?? "";
  if (!key) return { kind: "missing" };
  if (hasPrefix(key, STRIPE_LIVE_SECRET_PREFIX)) return { kind: "live", key };
  if (hasPrefix(key, STRIPE_TEST_SECRET_PREFIX)) return { kind: "test", key };
  return { kind: "invalid" };
}

export function parseStripePublishableKey(raw?: string | null): ParsedStripeKey {
  const key = raw?.trim() ?? "";
  if (!key) return { kind: "missing" };
  if (hasPrefix(key, STRIPE_LIVE_PUBLISHABLE_PREFIX)) return { kind: "live", key };
  if (hasPrefix(key, STRIPE_TEST_PUBLISHABLE_PREFIX)) return { kind: "test", key };
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

/** STRIPE_MODE env. Default test. Ignored in non-production — see getStripeMode(). */
export function readStripeModeSetting(): StripeMode {
  return process.env.STRIPE_MODE?.trim().toLowerCase() === "live" ? "live" : "test";
}

export function isStripeProductionRuntime() {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === "production") return true;
  if (vercelEnv === "preview" || vercelEnv === "development") return false;
  return process.env.NODE_ENV === "production";
}

/**
 * Effective Stripe mode. Non-production is always test.
 * Live only when production AND STRIPE_MODE=live.
 */
export function getStripeMode(): StripeMode {
  if (!isStripeProductionRuntime()) return "test";
  return readStripeModeSetting();
}

export function getStripePriceEnvName(productId: string) {
  if (productId === "session" || productId === "pack-5" || productId === "online") {
    return STRIPE_PRICE_ENV[productId];
  }
  return null;
}

/** Env-mapped Price ID. Live aliases win in live mode. Never invent or hardcode an ID. */
export function readStripePriceId(productId: string) {
  if (getStripeMode() === "live") {
    if (productId === "session" || productId === "pack-5") {
      const liveId = readEnv(STRIPE_PRICE_LIVE_ENV[productId]);
      if (liveId) return liveId;
    }
  }
  const envName = getStripePriceEnvName(productId);
  if (!envName) return null;
  const id = readEnv(envName);
  return id || null;
}

export type StripeConfigReason = "live_keys" | "test_keys" | "missing_keys" | "invalid_keys";

export type StripeConfig =
  | {
      ok: true;
      mode: StripeMode;
      secretKey: string;
      publishableKey: string;
      webhookSecret: string;
    }
  | {
      ok: false;
      reason: StripeConfigReason;
      error: string;
      missing: string[];
    };

/** @deprecated Use StripeConfig. Kept so existing imports keep compiling. */
export type StripeTestConfig = StripeConfig;

export function evaluateStripeConfig(): StripeConfig {
  const mode = getStripeMode();
  const secret = parseStripeSecretKey(process.env.STRIPE_SECRET_KEY);
  const publishable = parseStripePublishableKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const webhookSecret = readEnv("STRIPE_WEBHOOK_SECRET");

  if (mode === "test" && (secret.kind === "live" || publishable.kind === "live")) {
    return {
      ok: false,
      reason: "live_keys",
      error: STRIPE_LIVE_KEYS_REJECTED,
      missing: [],
    };
  }

  if (mode === "live" && (secret.kind === "test" || publishable.kind === "test")) {
    return {
      ok: false,
      reason: "test_keys",
      error: STRIPE_TEST_KEYS_IN_LIVE_MODE,
      missing: [],
    };
  }

  if (secret.kind === "invalid" || publishable.kind === "invalid") {
    return {
      ok: false,
      reason: "invalid_keys",
      error: mode === "live" ? STRIPE_LIVE_KEYS_INVALID : STRIPE_TEST_KEYS_INVALID,
      missing: [],
    };
  }

  const missing: string[] = [];
  if (secret.kind === "missing") missing.push("STRIPE_SECRET_KEY");
  if (publishable.kind === "missing") missing.push("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  if (!webhookSecret) missing.push("STRIPE_WEBHOOK_SECRET");

  if (missing.length > 0 || secret.kind !== mode || publishable.kind !== mode) {
    return {
      ok: false,
      reason: "missing_keys",
      error: mode === "live" ? STRIPE_LIVE_KEYS_MISSING : STRIPE_TEST_KEYS_MISSING,
      missing,
    };
  }

  return {
    ok: true,
    mode,
    secretKey: secret.key,
    publishableKey: publishable.key,
    webhookSecret,
  };
}

/** Alias of evaluateStripeConfig — test is still the default mode. */
export function evaluateStripeTestConfig(): StripeConfig {
  return evaluateStripeConfig();
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
  return evaluateStripeConfig().ok;
}
