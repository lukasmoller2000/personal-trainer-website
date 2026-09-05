"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  customerOrderStatusLabel,
  paymentSuccessNextStep,
} from "@/lib/payment-result";
import { formatDate } from "@/lib/utils";

type OrderView = {
  status: string;
  productName: string;
  productId?: string;
  amountLabel: string | null;
  date?: string | null;
  time?: string | null;
  remaining?: number | null;
  totalSessions?: number | null;
  accessToken?: string | null;
  paid?: boolean;
};

export function PaymentConfirmation({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Betalingen kunne ikke findes.");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/orders/status?session_id=${encodeURIComponent(sessionId)}`
        );
        const json = (await response.json()) as OrderView & { error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setError(
            json.error && !/session|stripe|order|id/i.test(json.error)
              ? json.error
              : "Kunne ikke hente betalingsstatus. Prøv igen om et øjeblik."
          );
          return;
        }
        setData(json);
        attempts += 1;
        if (json.status !== "paid" && json.status !== "failed" && attempts < 15) {
          window.setTimeout(() => {
            void load();
          }, 2000);
        } else if (json.status !== "paid" && json.status !== "failed" && attempts >= 15) {
          setError(
            "Betalingen er endnu ikke bekræftet. Tjek din mail om et øjeblik, eller skriv til Lukas hvis beløbet er trukket."
          );
        }
      } catch {
        if (!cancelled) setError("Kunne ikke hente betalingsstatus. Prøv igen om et øjeblik.");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-sand bg-white p-8 text-center md:p-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Vi kunne ikke bekræfte betalingen
        </h1>
        <p className="mt-4 text-ink/60">{error}</p>
        <p className="mt-3 text-sm text-ink/50">
          Intet vises som betalt, før betalingen er bekræftet.
        </p>
        <Button href="/booking" className="mt-8">
          Tilbage til booking
        </Button>
      </div>
    );
  }

  if (!data || (data.status !== "paid" && data.status !== "failed")) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-sand bg-white p-8 text-center md:p-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Bekræfter betaling...
        </h1>
        <p className="mt-4 text-ink/60">
          Vi venter på bekræftelse. Luk ikke siden.
        </p>
      </div>
    );
  }

  if (data.status === "failed") {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-sand bg-white p-8 text-center md:p-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Betalingen gik ikke igennem
        </h1>
        <p className="mt-4 text-ink/60">
          Der blev ikke trukket penge, og intet er markeret som betalt. Prøv igen, eller skriv til
          mig.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/booking">Prøv igen</Button>
          <Button href="/" variant="ghost">
            Til forsiden
          </Button>
        </div>
      </div>
    );
  }

  const hasClipCard = Boolean(data.totalSessions != null && data.totalSessions > 1);
  const nextStep = paymentSuccessNextStep({
    productId: data.productId,
    hasClipCard,
    hasTimeslot: Boolean(data.date && data.time),
  });

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-sand bg-white p-8 text-center md:p-12">
      <CheckCircle className="mx-auto mb-5 h-12 w-12 text-sage" />
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        Betalingen er modtaget
      </h1>
      <p className="mt-3 text-ink/60">Tak — betalingen er bekræftet.</p>
      <dl className="mt-8 space-y-3 text-left text-sm">
        <Row label="Ydelse" value={data.productName} />
        {data.amountLabel ? <Row label="Pris" value={data.amountLabel} /> : null}
        <Row label="Status" value={customerOrderStatusLabel(data.status)} />
        {data.date && data.time ? (
          <>
            <Row label="Dato" value={formatDate(data.date)} />
            <Row label="Tidspunkt" value={data.time} />
          </>
        ) : null}
        {hasClipCard ? (
          <>
            <Row label="Pakke" value={`${data.totalSessions} træninger`} />
            <Row
              label="Klip tilbage"
              value={`${data.remaining ?? data.totalSessions} træninger`}
            />
          </>
        ) : null}
      </dl>
      <p className="mt-6 text-left text-sm text-ink/65">{nextStep}</p>
      {data.accessToken ? (
        <Button href={`/booking?klip=${data.accessToken}`} className="mt-8">
          Book en træning
        </Button>
      ) : (
        <Button href="/" className="mt-8">
          Til forsiden
        </Button>
      )}
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
