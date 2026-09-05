import Link from "next/link";
import { paymentCancelCopy } from "@/lib/payment-result";

export function PaymentCanceledBanner({ productId }: { productId?: string }) {
  const copy = paymentCancelCopy();
  const retryHref = productId
    ? `/booking?produkt=${encodeURIComponent(productId)}`
    : "/booking";

  return (
    <div
      className="mb-8 rounded-2xl border border-sand bg-white px-5 py-4 text-sm text-ink/75 md:px-6"
      role="status"
    >
      <p className="font-medium text-ink">{copy.title}</p>
      <p className="mt-1">{copy.body}</p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        <Link href={retryHref} className="underline underline-offset-2 hover:text-ink">
          {copy.tryAgain}
        </Link>
        <Link href="/booking" className="underline underline-offset-2 hover:text-ink">
          {copy.goBack}
        </Link>
      </p>
    </div>
  );
}
