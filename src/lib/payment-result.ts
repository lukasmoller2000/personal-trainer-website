/**
 * Customer-facing payment success/cancel copy.
 * No session IDs, Stripe objects, or internal dumps.
 */

export const PAYMENT_CANCEL_QUERY = "annulleret";

export type CustomerOrderStatus = "paid" | "pending" | "failed" | "cancelled" | "unknown";

export function customerOrderStatusLabel(status: string): string {
  if (status === "paid") return "Betalt";
  if (status === "failed" || status === "cancelled") return "Ikke betalt";
  if (status === "pending") return "Afventer bekræftelse";
  return "Ukendt";
}

export function paymentSuccessNextStep(input: {
  productId?: string | null;
  hasClipCard: boolean;
  hasTimeslot: boolean;
}) {
  if (input.hasClipCard || input.productId === "pack-5") {
    return "Næste skridt: book din første træning med klippekortet. Du kan se, hvor mange træninger du har tilbage.";
  }
  if (input.hasTimeslot || input.productId === "session") {
    return "Næste skridt: tiden gælder, når betalingen er bekræftet. Jeg vender tilbage på mail, hvis der mangler noget.";
  }
  return "Næste skridt: jeg vender tilbage på mail eller telefon.";
}

export function paymentCancelCopy() {
  return {
    title: "Betalingen blev ikke gennemført",
    body: "Der blev ikke trukket penge, og intet er markeret som betalt. Du kan prøve igen eller gå tilbage.",
    tryAgain: "Prøv igen",
    goBack: "Tilbage til booking",
  };
}

export function bookingCancelQuery(productId: string) {
  return `/booking?produkt=${encodeURIComponent(productId)}&betaling=${PAYMENT_CANCEL_QUERY}`;
}
