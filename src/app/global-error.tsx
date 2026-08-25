"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="da">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#f3f1ec] px-5 text-center text-[#011010]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7a7a6a]">
          Fejl
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Noget gik galt</h1>
        <p className="mt-3 max-w-md text-black/60">
          Prøv igen, eller gå tilbage til forsiden.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#c8ff00] px-6 font-medium"
          >
            Prøv igen
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/20 px-6 font-medium"
          >
            Forside
          </Link>
        </div>
      </body>
    </html>
  );
}
