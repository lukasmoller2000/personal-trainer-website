import type { Metadata } from "next";
import { BookingPaymentCard } from "@/components/booking/BookingPaymentCard";
import { Button } from "@/components/ui/Button";
import {
  evaluateSessionPayment,
  publicPaymentPageView,
  verifyBookingPaymentLinkToken,
} from "@/lib/booking-payment";
import { isPaymentsReady } from "@/lib/commerce";
import { getPrisma } from "@/lib/db";
import { PAYMENT_CANCEL_QUERY } from "@/lib/payment-result";

export const metadata: Metadata = {
  title: "Betal personlig træning",
  robots: { index: false, follow: false },
};

export default async function BookingPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ betaling?: string }>;
}) {
  const { token: rawToken } = await params;
  const { betaling } = await searchParams;
  const token = decodeURIComponent(rawToken);
  const verified = verifyBookingPaymentLinkToken(token);
  const canceled = betaling === PAYMENT_CANCEL_QUERY;

  if (!verified.ok) {
    return <PaymentLinkMessage title="Linket er ugyldigt" body="Linket er ugyldigt eller udløbet." />;
  }

  const prisma = getPrisma();
  const booking = prisma
    ? await prisma.booking.findUnique({
        where: { id: verified.bookingId },
        include: { order: true },
      })
    : null;

  if (!booking) {
    return <PaymentLinkMessage title="Linket er ugyldigt" body="Linket er ugyldigt eller udløbet." />;
  }

  const payable = evaluateSessionPayment({
    id: booking.id,
    productId: booking.productId,
    status: booking.status,
    date: booking.date,
    time: booking.time,
    name: booking.name,
    holdUntil: booking.holdUntil,
    orderStatus: booking.order?.status ?? null,
  });

  if (!payable.ok && payable.reason === "already_paid") {
    return (
      <PaymentLinkMessage
        title="Allerede betalt"
        body="Denne træning er allerede betalt og bekræftet."
      />
    );
  }
  if (!payable.ok && payable.reason === "unconfirmed") {
    return (
      <PaymentLinkMessage
        title="Ikke bekræftet endnu"
        body="Tiden er ikke bekræftet endnu. Du får et nyt link, når den er det."
      />
    );
  }
  if (!payable.ok && payable.reason !== "in_progress") {
    return <PaymentLinkMessage title="Ikke tilgængelig" body={payable.error} />;
  }

  if (!booking.date || !booking.time) {
    return (
      <PaymentLinkMessage title="Ikke tilgængelig" body="Bookingen mangler dato og tid." />
    );
  }

  const view = publicPaymentPageView(booking);

  return (
    <section className="section-padding">
      <div className="container-custom">
        <BookingPaymentCard
          paymentToken={token}
          productName={view.productName}
          date={booking.date}
          time={booking.time}
          amountLabel={view.amountLabel}
          canceled={canceled}
          paymentsReady={isPaymentsReady()}
        />
      </div>
    </section>
  );
}

function PaymentLinkMessage({ title, body }: { title: string; body: string }) {
  return (
    <section className="section-padding">
      <div className="container-custom">
        <div className="mx-auto max-w-xl rounded-2xl border border-sand bg-white p-8 text-center md:p-12">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-4 text-ink/60">{body}</p>
          <Button href="/booking" className="mt-8">
            Til booking
          </Button>
        </div>
      </div>
    </section>
  );
}
