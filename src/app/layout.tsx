import type { Metadata, Viewport } from "next";
import { Archivo, Outfit } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getSiteUrl, siteConfig } from "@/lib/utils";
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
    default: "Lukas Møller – Personlig træning",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Lukas Møller",
    "personlig træner",
    "personlig træning Viborg",
    "online coaching",
    "book personlig træning",
    "styrketræning",
  ],
  openGraph: {
    type: "website",
    locale: "da_DK",
    url: siteUrl,
    title: "Lukas Møller – Personlig træning",
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: "/images/lukas-training.jpg",
        width: 800,
        height: 1200,
        alt: "Lukas Møller, personlig træner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lukas Møller – Personlig træning",
    description: siteConfig.description,
    images: ["/images/lukas-training.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteUrl,
    email: siteConfig.links.email,
    telephone: siteConfig.links.phone,
    founder: {
      "@type": "Person",
      name: siteConfig.trainer,
      jobTitle: siteConfig.role,
      worksFor: {
        "@type": "HealthClub",
        name: siteConfig.venue,
      },
    },
    containedInPlace: {
      "@type": "HealthClub",
      name: siteConfig.venue,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.split(",")[0].trim(),
      postalCode: siteConfig.postalCode,
      addressLocality: siteConfig.location,
      addressCountry: "DK",
    },
  };

  return (
    <html lang="da" className={`${outfit.variable} ${archivo.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
