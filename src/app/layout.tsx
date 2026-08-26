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
    image: `${siteUrl}/images/lukas-training.jpg`,
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
    sameAs: [
      siteConfig.links.instagramPersonal,
      siteConfig.links.instagram,
      siteConfig.links.facebook,
      siteConfig.links.tiktok,
    ],
    priceRange: "350-799 DKK",
    makesOffer: [
      {
        "@type": "Offer",
        name: "Personlig træning",
        price: "350",
        priceCurrency: "DKK",
      },
      {
        "@type": "Offer",
        name: "Online Coaching",
        price: "799",
        priceCurrency: "DKK",
      },
    ],
  };

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
