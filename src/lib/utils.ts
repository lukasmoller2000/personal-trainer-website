import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

function asHttpsUrl(hostOrUrl: string) {
  const value = stripTrailingSlash(hostOrUrl.trim());
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

const PRODUCTION_SITE_URL = "https://lukasmoller.dk";
const LOCAL_FALLBACK_URL = "http://localhost:3000";

function isLocalhostUrl(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

function isProductionRuntime() {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === "production") return true;
  if (vercelEnv === "preview" || vercelEnv === "development") return false;
  return process.env.NODE_ENV === "production";
}

/** APP_URL first, then NEXT_PUBLIC_SITE_URL. One helper for checkout, SEO and mail. */
function readConfiguredSiteUrl() {
  return process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
}

export function getSiteUrl() {
  const explicit = readConfiguredSiteUrl();
  const onVercel = Boolean(process.env.VERCEL);
  const production = isProductionRuntime();

  // Never ship localhost as the canonical URL in production or on Vercel.
  if (explicit && !(isLocalhostUrl(explicit) && (onVercel || production))) {
    return stripTrailingSlash(explicit);
  }

  if (process.env.VERCEL_ENV === "production") {
    const productionHost =
      process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
    if (productionHost) return asHttpsUrl(productionHost);
    return PRODUCTION_SITE_URL;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl && !production) return asHttpsUrl(vercelUrl);

  if (production) {
    if (vercelUrl) return asHttpsUrl(vercelUrl);
    return PRODUCTION_SITE_URL;
  }

  return LOCAL_FALLBACK_URL;
}

export const siteConfig = {
  name: "Lukas Møller",
  trainer: "Lukas Møller",
  role: "Personlig træner",
  description:
    "Personlig træner i Viborg. 1:1 PT i Viborg Fitness Gym til 300 kr., eller online coaching til 799 kr./md. Styrke, fedttab og en hverdag der holder.",
  location: "Viborg",
  postalCode: "8800",
  venue: "Viborg Fitness Gym",
  gymUrl: "https://viborgfitnessgym.dk/",
  /** Training location at Viborg Fitness Gym — not the legal business address. */
  address: "Falkevej 16B, 8800 Viborg",
  links: {
    email: "lukasmoller2000@gmail.com",
    phone: "+45 25 89 04 53",
    /** Viborg Fitness Gym — HVEM / About / gym clusters */
    instagram: "https://www.instagram.com/viborgfitnessgym_falkevej/",
    /** @lukasvmj — header/navigation */
    instagramPersonal: "https://www.instagram.com/lukasvmj/",
    facebook: "https://www.facebook.com/viborgfitnessgym/",
    tiktok: "https://www.tiktok.com/@viborgfitnessgym",
    youtube: "https://www.youtube.com/shorts/faadsdhPfgc",
  },
  hours: "05–00 alle dage",
  nav: [
    { label: "Forside", href: "/" },
    { label: "Ydelser", href: "/ydelser" },
    { label: "Booking", href: "/booking" },
    { label: "Om", href: "/om" },
    { label: "FAQ", href: "/faq" },
    { label: "Kontakt", href: "/kontakt" },
  ],
};

export function formatPrice(amount?: number) {
  if (amount == null) return null;
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function priceLabel(product: {
  price?: number;
  tagline: string;
  pricePrefix?: string;
  priceSuffix?: string;
}) {
  const formatted = formatPrice(product.price);
  if (!formatted) return product.tagline;
  return `${product.pricePrefix ?? ""}${formatted}${product.priceSuffix ?? ""}`;
}

export function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${isoDate}T12:00:00`));
}
