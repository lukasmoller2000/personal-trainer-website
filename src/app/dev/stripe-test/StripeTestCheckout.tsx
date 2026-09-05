import type { StripeDevCheckoutPayload } from "@/lib/stripe-dev-checkout-test";

const buttonClassName =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-sage px-6 text-base font-medium text-ink transition-colors duration-200 hover:bg-moss focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-12";

/**
 * Vanilla click handler on purpose. The Next.js client bundle can 404 when
 * `.next` is stale, which leaves a React onClick unwired after SSR.
 */
export function StripeTestCheckout({
  sessionPayload,
  pack5Payload,
}: {
  sessionPayload: StripeDevCheckoutPayload;
  pack5Payload: StripeDevCheckoutPayload;
}) {
  return (
    <form className="mt-8 space-y-4" action="/api/checkout" method="post">
      <p id="stripe-test-error" className="text-sm text-red-700" role="alert" hidden />
      <button
        id="stripe-test-checkout"
        type="button"
        className={buttonClassName}
        data-payload={JSON.stringify(sessionPayload)}
      >
        Test PT session – 300 kr.
      </button>
      <button
        id="stripe-test-checkout-pack-5"
        type="button"
        className={buttonClassName}
        data-payload={JSON.stringify(pack5Payload)}
      >
        Test 5 PT-klip – 1.350 kr.
      </button>
      {/* Raw script so the handler loads even if Next hydration chunks 404. */}
      <script src="/dev-stripe-test.js" defer />
    </form>
  );
}
