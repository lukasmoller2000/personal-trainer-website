import { NextResponse } from "next/server";
import { isStripeDevEndpointAllowed } from "@/lib/stripe-config";

/**
 * Production (and `next start`) must 404 /dev and /api/dev.
 * notFound() in the App Router can still emit HTTP 200 with 404 UI.
 */
export function middleware() {
  if (isStripeDevEndpointAllowed()) {
    return NextResponse.next();
  }

  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export const config = {
  matcher: ["/dev/:path*", "/api/dev/:path*"],
};
