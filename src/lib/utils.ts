import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  // Local metadata fallback only. Canonical URL comes from NEXT_PUBLIC_SITE_URL.
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Lukas Møller",
  trainer: "Lukas Møller",
  role: "Personlig træner",
  description:
    "Personlig træning i Viborg med Lukas Møller. Book en PT til 350 kr. eller start Online Coaching fra 799 kr./md.",
  location: "Viborg",
  postalCode: "8800",
  venue: "Viborg Fitness Gym",
  gymUrl: "https://viborgfitnessgym.dk/",
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
