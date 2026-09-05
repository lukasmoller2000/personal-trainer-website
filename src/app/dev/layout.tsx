import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isStripeDevEndpointAllowed } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dev",
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (!isStripeDevEndpointAllowed()) notFound();
  return children;
}
