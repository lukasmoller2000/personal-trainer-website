"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { AdminBookingRow, AdminDashboardData } from "@/lib/admin-data";
import { adminRefundProductName, paymentStatusLabel, refundStatusLabel } from "@/lib/refund-policy";

export function AdminDashboard({ bookings, orders, clipCards }: AdminDashboardData) {
  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Admin</h1>
        <button
          type="button"
          className="text-sm text-ink/55 underline"
          onClick={() => {
            void fetch("/api/admin/logout", { method: "POST" }).then(() => {
              window.location.reload();
            });
          }}
        >
          Log ud
        </button>
      </div>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">
          Bookinger
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-sand bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sand/60 text-ink/60">
              <tr>
                <th className="px-4 py-3 font-medium">Navn</th>
                <th className="px-4 py-3 font-medium">Kontakt</th>
                <th className="px-4 py-3 font-medium">Tid</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Handling</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((row) => (
                <tr key={row.id} className="border-t border-sand">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">
                    {row.email}
                    <br />
                    {row.phone}
                  </td>
                  <td className="px-4 py-3">
                    {row.date ?? "—"} {row.time ?? ""}
                    <br />
                    <span className="text-ink/45">{row.productId}</span>
                  </td>
                  <td className="px-4 py-3">{statusLabel(row.status)}</td>
                  <td className="px-4 py-3">
                    <BookingActions row={row} />
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-ink/50" colSpan={5}>
                    Ingen bookinger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">Ordrer</h2>
        <div className="overflow-x-auto rounded-2xl border border-sand bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sand/60 text-ink/60">
              <tr>
                <th className="px-4 py-3 font-medium">Kunde</th>
                <th className="px-4 py-3 font-medium">Ydelse og beløb</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Handling</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((row) => (
                <tr key={row.id} className="border-t border-sand">
                  <td className="px-4 py-3">
                    {row.customerName}
                    <br />
                    {row.customerEmail}
                    <br />
                    {row.customerPhone}
                  </td>
                  <td className="px-4 py-3">
                    {adminRefundProductName(row.productId)}
                    <br />
                    {(row.amountOre / 100).toFixed(0)} kr.
                  </td>
                  <td className="px-4 py-3">
                    Betaling: {paymentStatusLabel(row.status)}
                    <br />
                    Refundering: {refundStatusLabel(row.status)}
                  </td>
                  <td className="px-4 py-3">
                    {row.canRefund ? (
                      <RefundButton
                        orderId={row.id}
                        amountOre={row.amountOre}
                        productName={adminRefundProductName(row.productId)}
                      />
                    ) : row.status === "refunded" ? (
                      "Refunderet"
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-ink/50" colSpan={4}>
                    Ingen ordrer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink/50">
          Refundering tilbagefører hele beløbet i Stripe. Klippekort kan kun refunderes, hvis ingen
          klip er brugt.
        </p>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold tracking-tight text-ink">
          Klippekort
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-sand bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sand/60 text-ink/60">
              <tr>
                <th className="px-4 py-3 font-medium">Navn</th>
                <th className="px-4 py-3 font-medium">Mail</th>
                <th className="px-4 py-3 font-medium">Klip</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {clipCards.map((row) => (
                <tr key={row.id} className="border-t border-sand">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">
                    {row.remaining} træninger tilbage / {row.totalSessions}
                  </td>
                  <td className="px-4 py-3">{statusLabel(row.status)}</td>
                </tr>
              ))}
              {clipCards.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-ink/50" colSpan={4}>
                    Ingen klippekort.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BookingActions({ row }: { row: AdminBookingRow }) {
  const [busy, setBusy] = useState(false);
  const sessionInquiry = row.productId === "session" && row.status === "inquiry" && row.date && row.time;
  const awaitingPay = row.productId === "session" && row.status === "awaiting_payment";
  if (!sessionInquiry && !awaitingPay) return "—";

  const act = async (action: "confirm" | "reject" | "resend") => {
    if (action === "reject") {
      const confirmed = window.confirm("Afvis denne forespørgsel? Kunden får en besked.");
      if (!confirmed) return;
    }
    setBusy(true);
    const response = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: row.id, action }),
    });
    const data = (await response.json()) as { error?: string; paymentUrl?: string | null };
    if (!response.ok) {
      window.alert(data.error ?? "Kunne ikke opdatere bookingen");
      setBusy(false);
      return;
    }
    if (data.paymentUrl && (action === "confirm" || action === "resend")) {
      window.prompt("Betalingslink til kunden:", data.paymentUrl);
    }
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {sessionInquiry ? (
        <Button size="sm" disabled={busy} onClick={() => void act("confirm")}>
          Bekræft tid
        </Button>
      ) : null}
      {awaitingPay ? (
        <Button size="sm" disabled={busy} onClick={() => void act("resend")}>
          Send betalingslink
        </Button>
      ) : null}
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void act("reject")}>
        Afvis
      </Button>
    </div>
  );
}

function RefundButton({
  orderId,
  amountOre,
  productName,
}: {
  orderId: string;
  amountOre: number;
  productName: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        const confirmed = window.confirm(
          `Refundér hele beløbet (${amountOre / 100} kr.) for ${productName} i Stripe? Kunden får pengene tilbage.`
        );
        if (!confirmed) return;
        setBusy(true);
        const response = await fetch("/api/admin/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          window.alert(data.error ?? "Kunne ikke refundere");
          setBusy(false);
          return;
        }
        window.location.reload();
      }}
    >
      Refundér
    </Button>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    inquiry: "Forespørgsel",
    awaiting_payment: "Bekræftet — afventer betaling",
    hold: "Betaling i gang",
    confirmed: "Betalt",
    cancelled: "Aflyst",
    rejected: "Afvist",
    no_show: "Udeblevet",
    active: "Aktiv",
    expired: "Udløbet",
    exhausted: "Brugt op",
    pending: "Afventer",
    paid: "Betalt",
    refunded: "Refunderet",
    failed: "Fejlet",
  };
  return labels[status] ?? status;
}
