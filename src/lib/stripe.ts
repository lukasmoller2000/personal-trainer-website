import Stripe from "stripe";
import { missingPaymentEnv } from "@/lib/commerce";
import { evaluateStripeTestConfig, parseStripeSecretKey } from "@/lib/stripe-config";

let client: Stripe | null = null;
let clientKey: string | null = null;

/** Only constructs a client from an accepted sk_test_ key. Live keys never reach Stripe. */
export function getStripe(): Stripe | null {
  const parsed = parseStripeSecretKey(process.env.STRIPE_SECRET_KEY);
  if (parsed.kind !== "test") {
    client = null;
    clientKey = null;
    return null;
  }
  if (!client || clientKey !== parsed.key) {
    client = new Stripe(parsed.key);
    clientKey = parsed.key;
  }
  return client;
}

export function getStripePublishableKey() {
  const config = evaluateStripeTestConfig();
  return config.ok ? config.publishableKey : "";
}

export function getStripeWebhookSecret() {
  const config = evaluateStripeTestConfig();
  return config.ok ? config.webhookSecret : "";
}

export { missingPaymentEnv };
