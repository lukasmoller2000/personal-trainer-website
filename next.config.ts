import type { NextConfig } from "next";

/**
 * Loose, known-good allowlist for Next 15 + hosted Stripe Checkout.
 * Next hydrates with inline scripts (and this app ships JSON-LD inline), so a
 * nonce/hash CSP is a separate task — do not tighten script-src without that.
 * No analytics domains. Resend is server-side. Fonts are self-hosted via next/font.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.stripe.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://js.stripe.com https://hooks.stripe.com https://vercel.live",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://vercel.live",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "stripe"],
  async headers() {
    return [
      {
        // Keep Next internals on their own Content-Type. nosniff on a 404
        // text/plain JS chunk becomes a window error Event → overlay "[object Event]".
        source: "/((?!_next/).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
      {
        source: "/dev/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/dev/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
