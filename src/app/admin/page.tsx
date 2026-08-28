import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { ADMIN_COOKIE, isAdminConfigured, isValidAdminCookie } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!isAdminConfigured()) notFound();

  const jar = await cookies();
  if (!isValidAdminCookie(jar.get(ADMIN_COOKIE)?.value)) {
    return (
      <section className="section-padding">
        <div className="container-custom">
          <AdminLogin />
        </div>
      </section>
    );
  }

  const prisma = getPrisma();
  if (!prisma) {
    return (
      <section className="section-padding">
        <div className="container-custom">
          <AdminDashboard bookings={[]} orders={[]} clipCards={[]} />
        </div>
      </section>
    );
  }

  const [bookings, orders, clipCards] = await Promise.all([
    prisma.booking.findMany({
      orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.clipCard.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  return (
    <section className="section-padding">
      <div className="container-custom">
        <AdminDashboard
          bookings={bookings.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            productId: row.productId,
            date: row.date,
            time: row.time,
            status: row.status,
            createdAt: row.createdAt.toISOString(),
          }))}
          orders={orders.map((row) => ({
            id: row.id,
            productId: row.productId,
            status: row.status,
            amountOre: row.amountOre,
            customerName: row.customerName,
            customerEmail: row.customerEmail,
            customerPhone: row.customerPhone,
            stripeCheckoutSessionId: row.stripeCheckoutSessionId,
            stripePaymentIntentId: row.stripePaymentIntentId,
            date: row.date,
            time: row.time,
          }))}
          clipCards={clipCards.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            remaining: row.remaining,
            totalSessions: row.totalSessions,
            status: row.status,
            orderId: row.orderId,
          }))}
        />
      </div>
    </section>
  );
}
