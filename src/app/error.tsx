"use client";

import { Button } from "@/components/ui/Button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage">Fejl</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">
        Noget gik galt
      </h1>
      <p className="mt-3 max-w-md text-ink/60">
        Prøv igen, eller gå tilbage til forsiden.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={() => reset()}>
          Prøv igen
        </Button>
        <Button href="/" variant="outline">
          Forside
        </Button>
      </div>
    </section>
  );
}
