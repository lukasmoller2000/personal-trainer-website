import type { Metadata } from "next";
import { getCompanyConfig } from "@/lib/commerce";
import { siteConfig } from "@/lib/utils";

export function pageSeo(path: string, meta: Metadata = {}): Metadata {
  const title = typeof meta.title === "string" ? meta.title : undefined;
  const description = typeof meta.description === "string" ? meta.description : undefined;

  return {
    ...meta,
    alternates: {
      canonical: path,
      ...meta.alternates,
    },
    openGraph: {
      url: path,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...meta.openGraph,
    },
  };
}

/** Gym / training location. Not the legal business address. */
function trainingPostalAddress() {
  return {
    "@type": "PostalAddress" as const,
    streetAddress: siteConfig.address.split(",")[0].trim(),
    postalCode: siteConfig.postalCode,
    addressLocality: siteConfig.location,
    addressCountry: "DK",
  };
}

export function siteJsonLd(siteUrl: string) {
  const company = getCompanyConfig();
  const personId = `${siteUrl}/#person`;
  const businessId = `${siteUrl}/#business`;
  const gymId = `${siteUrl}/#gym`;
  const ptId = `${siteUrl}/#pt`;
  const coachingId = `${siteUrl}/#coaching`;
  const sameAs = [
    siteConfig.links.instagramPersonal,
    siteConfig.links.instagram,
    siteConfig.links.facebook,
    siteConfig.links.tiktok,
  ];
  const image = `${siteUrl}/images/lukas-portrait.png`;
  const legalAddress = company.address
    ? {
        "@type": "PostalAddress" as const,
        streetAddress: company.address,
        addressCountry: "DK",
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        name: siteConfig.trainer,
        jobTitle: siteConfig.role,
        url: siteUrl,
        image,
        email: siteConfig.links.email,
        telephone: siteConfig.links.phone,
        workLocation: { "@id": gymId },
        sameAs,
      },
      {
        "@type": "LocalBusiness",
        "@id": businessId,
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteUrl,
        image,
        email: siteConfig.links.email,
        telephone: siteConfig.links.phone,
        ...(legalAddress ? { address: legalAddress } : {}),
        location: { "@id": gymId },
        areaServed: siteConfig.location,
        founder: { "@id": personId },
        sameAs,
        makesOffer: [
          { "@type": "Offer", itemOffered: { "@id": ptId } },
          { "@type": "Offer", itemOffered: { "@id": coachingId } },
        ],
      },
      {
        "@type": "HealthClub",
        "@id": gymId,
        name: siteConfig.venue,
        url: siteConfig.gymUrl,
        address: trainingPostalAddress(),
      },
      {
        "@type": "Service",
        "@id": ptId,
        name: "Personlig træning",
        serviceType: "Personlig træning",
        description:
          "1:1 personlig træning i Viborg Fitness Gym med Lukas Møller. Teknik, styrke og progression.",
        provider: { "@id": personId },
        areaServed: siteConfig.location,
        offers: [
          {
            "@type": "Offer",
            name: "1 session",
            price: "300",
            priceCurrency: "DKK",
          },
          {
            "@type": "Offer",
            name: "5 træninger",
            price: "1350",
            priceCurrency: "DKK",
          },
        ],
      },
      {
        "@type": "Service",
        "@id": coachingId,
        name: "Online Coaching",
        serviceType: "Online coaching",
        description:
          "Løbende online coaching med træningsprogram, kostplan og opfølgning.",
        provider: { "@id": personId },
        areaServed: "DK",
        offers: {
          "@type": "Offer",
          price: "799",
          priceCurrency: "DKK",
        },
      },
    ],
  };
}
