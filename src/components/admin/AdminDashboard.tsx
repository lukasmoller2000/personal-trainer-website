"use client";

import { Button } from "@/components/ui/Button";

type BookingRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  productId: string;
  date: string | null;
  time: string | null;
  status: string;
  createdAt: string;
};

type OrderRow = {
  id: string;
  productId: string;
  status: string;
  amountOre: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  date: string | null;
  time: string | null;
};

type ClipRow = {
  id: string;
  name: string;
  email: string;
  remaining: number;
  totalSessions: number;
  status: string;
  orderId: string;
};

export function AdminDashboard({
  bookings,
  orders,
  clipCards,
}: {
  bookings: BookingRow[];
  orders: OrderRow[];
  clipCards: ClipRow[];
}) {
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
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-ink/50" colSpan={4}>
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
                <th className="px-4 py-3 font-medium">Betaling</th>
                <th className="px-4 py-3 font-medium">Stripe</th>
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
                    {row.status} · {(row.amountOre / 100).toFixed(0)} kr.
                    <br />
                    {row.productId}
                  </td>
                  <td className="px-4 py-3 text-xs break-all">
                    {row.stripePaymentIntentId ?? row.stripeCheckoutSessionId ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "paid" ? (
                      <RefundButton orderId={row.id} />
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
          Refundering her annullerer kun ubrugte klip i systemet. Selve pengene refunderes manuelt i
          Stripe.
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

function RefundButton({ orderId }: { orderId: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        const confirmed = window.confirm(
          "Markér ubrugt klippekort som refunderet i systemet? Pengene refunderes ikke automatisk i Stripe."
        );
        if (!confirmed) return;
        const response = await fetch("/api/admin/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          window.alert(data.error ?? "Kunne ikke refundere");
          return;
        }
        window.location.reload();
      }}
    >
      Refundér ubrugt
    </Button>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    inquiry: "Forespørgsel",
    hold: "Afventer betaling",
    confirmed: "Aktiv",
    cancelled: "Aflyst",
    no_show: "Udeblevet",
    active: "Aktiv",
    exhausted: "Brugt op",
    pending: "Afventer",
    paid: "Betalt",
    refunded: "Refunderet",
    failed: "Fejlet",
  };
  return labels[status] ?? status;
}
