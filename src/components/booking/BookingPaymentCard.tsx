"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PaymentCanceledBanner } from "@/components/booking/PaymentCanceledBanner";
import { cancellationConfig, sessionDuration } from "@/lib/commerce";
import { EARLY_PERFORMANCE_CONSENT } from "@/lib/early-performance";
import { formatDate } from "@/lib/utils";
import { readErrorMessage } from "@/lib/validation";
import Link from "next/link";

export function BookingPaymentCard({
  paymentToken,
  productName,
  date,
  time,
  amountLabel,
  canceled = false,
  paymentsReady = false,
}: {
  paymentToken: string;
  productName: string;
  date: string;
  time: string;
  amountLabel: string;
  canceled?: boolean;
  paymentsReady?: boolean;
}) {
  const [earlyPerformanceRequested, setEarlyPerformanceRequested] = useState<boolean>(
    EARLY_PERFORMANCE_CONSENT.defaultChecked
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (!earlyPerformanceRequested) {
      setError("Bekræft, at du ønsker at ydelsen kan begynde, før fortrydelsesfristen er udløbet.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "session",
          paymentToken,
          earlyPerformanceRequested,
        }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Betaling kunne ikke startes"));
      }
      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error("Betaling kunne ikke startes");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-sand bg-white p-8 md:p-12">
      {canceled ? <PaymentCanceledBanner productId="session" /> : null}
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        Betal din træning
      </h1>
      <p className="mt-3 text-ink/60">
        Tiden er bekræftet. Den gælder først, når betalingen er gennemført.
      </p>
      <dl className="mt-8 space-y-3 text-sm">
        <Row label="Ydelse" value={productName} />
        <Row label="Dato" value={formatDate(date)} />
        <Row label="Tidspunkt" value={time} />
        <Row label="Pris" value={amountLabel} />
      </dl>
      <div className="mt-6 space-y-2 text-sm text-ink/55">
        <p>{sessionDuration.copy}</p>
        <p>
          Afbudsreglen på {cancellationConfig.freeCancelHours} timer gælder for bekræftede tider,
          når betalingen er gennemført.
        </p>
      </div>
      <div className="mt-6 rounded-xl border border-sand bg-sand/40 p-4">
        <label className="flex items-start gap-3 text-sm text-ink/80">
          <input
            type="checkbox"
            checked={earlyPerformanceRequested}
            onChange={(event) => setEarlyPerformanceRequested(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-sand"
            data-testid="early-performance-consent"
          />
          <span>
            <span className="font-medium text-ink">{EARLY_PERFORMANCE_CONSENT.checkboxLabel}</span>
            <span className="mt-1 block text-ink/55">{EARLY_PERFORMANCE_CONSENT.help}</span>
          </span>
        </label>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {!paymentsReady ? (
        <p className="mt-4 text-sm text-ink/55">
          Online betaling er ikke slået til endnu. Brug linket, når Lukas har aktiveret betaling,
          eller skriv til ham.
        </p>
      ) : null}
      <p className="mt-4 text-sm text-ink/50">
        Læs{" "}
        <Link href="/privatliv" className="underline underline-offset-2 hover:text-ink">
          privatlivspolitik
        </Link>{" "}
        og{" "}
        <Link href="/vilkaar" className="underline underline-offset-2 hover:text-ink">
          handelsbetingelser
        </Link>
        .
      </p>
      <Button className="mt-8 w-full" onClick={() => void pay()} disabled={submitting}>
        {submitting ? "Går til betaling..." : `Betal ${amountLabel}`}
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-sand pb-3 last:border-0 last:pb-0">
      <dt className="text-ink/45">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
