import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { ADMIN_COOKIE, isAdminConfigured, isValidAdminCookie } from "@/lib/admin-auth";
import { loadAdminDashboardData, type AdminDataClient } from "@/lib/admin-data";
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

  const data = await loadAdminDashboardData(getPrisma() as AdminDataClient | null);

  return (
    <section className="section-padding">
      <div className="container-custom">
        <AdminDashboard {...data} />
      </div>
    </section>
  );
}
