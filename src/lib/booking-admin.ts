import {
  BOOKING_STATUS,
  buildConfirmCustomerEmail,
  buildRejectCustomerEmail,
  canConfirmSessionInquiry,
  canRejectSessionBooking,
  canResendPaymentLink,
  createBookingPaymentLinkToken,
  isPaymentLinkSecretConfigured,
  shouldSendDecisionEmail,
  bookingPaymentUrl,
  type BookingDecision,
} from "@/lib/booking-payment";
import { getPrisma } from "@/lib/db";
import { trySendCustomerEmail, trySendNotification } from "@/lib/mail";
import { formatDate } from "@/lib/utils";

export class BookingAdminError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "BookingAdminError";
    this.status = status;
  }
}

export async function decideSessionBooking(input: {
  bookingId: string;
  action: BookingDecision;
}) {
  if (!isPaymentLinkSecretConfigured()) {
    throw new BookingAdminError("Betalingslink er ikke konfigureret", 503);
  }

  const prisma = getPrisma();
  if (!prisma) {
    throw new BookingAdminError("Databasen er ikke tilgængelig", 503);
  }

  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
  if (!booking) {
    throw new BookingAdminError("Bookingen blev ikke fundet", 404);
  }

  const fromStatus = booking.status;
  let nextStatus = fromStatus;

  if (input.action === "confirm") {
    const allowed = canConfirmSessionInquiry(booking);
    if (!allowed.ok) throw new BookingAdminError(allowed.error);
    nextStatus = BOOKING_STATUS.awaitingPayment;
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: nextStatus },
    });
  } else if (input.action === "reject") {
    const allowed = canRejectSessionBooking(booking);
    if (!allowed.ok) throw new BookingAdminError(allowed.error);
    nextStatus = BOOKING_STATUS.rejected;
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: nextStatus, cancelledAt: new Date() },
    });
  } else if (input.action === "resend") {
    const allowed = canResendPaymentLink(booking);
    if (!allowed.ok) throw new BookingAdminError(allowed.error);
  } else {
    throw new BookingAdminError("Ukendt handling");
  }

  const linkToken = createBookingPaymentLinkToken(booking.id);
  const paymentUrl = linkToken ? bookingPaymentUrl(linkToken) : "";
  const sendMail = shouldSendDecisionEmail(input.action, fromStatus);

  if (sendMail && input.action === "confirm" && booking.date && booking.time && paymentUrl) {
    const mail = buildConfirmCustomerEmail({
      name: booking.name,
      date: booking.date,
      time: booking.time,
      paymentUrl,
    });
    await trySendCustomerEmail({
      to: booking.email,
      subject: mail.subject,
      text: mail.text,
    });
    await trySendNotification({
      subject: `PT-tid bekræftet · ${booking.name}`,
      text: [
        "Tid bekræftet. Kunden har fået et betalingslink.",
        "",
        `Ydelse: Personlig træning`,
        booking.date && booking.time
          ? `Tid: ${formatDate(booking.date)} ${booking.time}`
          : "",
        "Pris: 300 kr.",
        "Status: Afventer betaling",
      ]
        .filter(Boolean)
        .join("\n"),
      replyTo: booking.email,
    });
  }

  if (sendMail && input.action === "resend" && booking.date && booking.time && paymentUrl) {
    const mail = buildConfirmCustomerEmail({
      name: booking.name,
      date: booking.date,
      time: booking.time,
      paymentUrl,
    });
    await trySendCustomerEmail({
      to: booking.email,
      subject: mail.subject,
      text: mail.text,
    });
  }

  if (sendMail && input.action === "reject") {
    const mail = buildRejectCustomerEmail({
      name: booking.name,
      date: booking.date,
      time: booking.time,
    });
    await trySendCustomerEmail({
      to: booking.email,
      subject: mail.subject,
      text: mail.text,
    });
    await trySendNotification({
      subject: `PT-forespørgsel afvist · ${booking.name}`,
      text: [
        "Forespørgslen er afvist. Kunden har fået besked.",
        booking.date && booking.time
          ? `Ønsket tid: ${formatDate(booking.date)} ${booking.time}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      replyTo: booking.email,
    });
  }

  return {
    ok: true as const,
    status: nextStatus,
    paymentUrl: input.action === "reject" ? null : paymentUrl || null,
  };
}
