import Stripe from "stripe";
import { missingPaymentEnv } from "@/lib/commerce";
import { evaluateStripeConfig } from "@/lib/stripe-config";

let client: Stripe | null = null;
let clientKey: string | null = null;

/**
 * Constructs a Stripe client only after evaluateStripeConfig() accepts the key.
 * Development never accepts sk_live_. Production live-mode never accepts sk_test_.
 */
export function getStripe(): Stripe | null {
  const config = evaluateStripeConfig();
  if (!config.ok) {
    client = null;
    clientKey = null;
    return null;
  }
  if (!client || clientKey !== config.secretKey) {
    client = new Stripe(config.secretKey);
    clientKey = config.secretKey;
  }
  return client;
}

export function getStripePublishableKey() {
  const config = evaluateStripeConfig();
  return config.ok ? config.publishableKey : "";
}

export function getStripeWebhookSecret() {
  const config = evaluateStripeConfig();
  return config.ok ? config.webhookSecret : "";
}

export { missingPaymentEnv };
