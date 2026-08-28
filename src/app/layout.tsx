import type { Metadata, Viewport } from "next";
import { Archivo, Outfit } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getSiteUrl, siteConfig } from "@/lib/utils";
import { siteJsonLd } from "@/lib/seo";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-archivo",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  themeColor: "#f3f1ec",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lukas Møller – Personlig træner i Viborg",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Lukas Møller",
    "personlig træner Viborg",
    "PT Viborg",
    "personlig træning Viborg",
    "styrketræning Viborg",
    "online coaching",
    "online coaching Viborg",
  ],
  openGraph: {
    type: "website",
    locale: "da_DK",
    title: "Lukas Møller – Personlig træner i Viborg",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/images/lukas-portrait.png",
        width: 473,
        height: 922,
        alt: "Lukas Møller, personlig træner i Viborg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lukas Møller – Personlig træner i Viborg",
    description: siteConfig.description,
    images: ["/images/lukas-portrait.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = siteJsonLd(siteUrl);

  return (
    <html lang="da" className={`${outfit.variable} ${archivo.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#indhold"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-sage focus:px-4 focus:py-2 focus:text-ink"
        >
          Spring til indhold
        </a>
        <Navbar />
        <main id="indhold">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
