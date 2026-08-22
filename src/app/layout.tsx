import type { Metadata } from "next";
import { Archivo, Outfit } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { siteConfig } from "@/lib/utils";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Lukas Møller – Personlig træning",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Lukas Møller",
    "personlig træner",
    "personlig træning Viborg",
    "PT forløb",
    "book personlig træning",
    "styrketræning",
  ],
  openGraph: {
    type: "website",
    locale: "da_DK",
    url: siteConfig.url,
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
    url: siteConfig.url,
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
      streetAddress: "Falkevej 16B",
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
