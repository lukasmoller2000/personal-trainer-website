export type ProductKind = "session" | "program";
export type ProductEmphasis = "simple" | "featured" | "premium";
export type BookingType = "session" | "inquiry";

export type Product = {
  id: string;
  kind: ProductKind;
  bookingType: BookingType;
  label: string;
  name: string;
  tagline: string;
  description: string;
  fits: string;
  sessions: number;
  weeks?: number;
  durationMinutes: number;
  price?: number;
  pricePrefix?: string;
  priceSuffix?: string;
  priceNote?: string;
  perks: string[];
  popular?: boolean;
  badge?: string;
  emphasis?: ProductEmphasis;
  cta: string;
};

export const products: Product[] = [
  {
    id: "session",
    kind: "session",
    bookingType: "session",
    label: "PT",
    name: "Personlig træning",
    tagline: "Det simple valg",
    description:
      "1:1 træning med mig i Viborg Fitness Gym. Vi arbejder med teknik, styrke, progression og dine konkrete mål.",
    fits: "Til dig, der vil booke én PT, når det passer.",
    sessions: 1,
    durationMinutes: 60,
    price: 350,
    priceNote: "pr. session",
    emphasis: "simple",
    cta: "Book personlig træning",
    perks: [
      "1:1 personlig træning",
      "Fokus på teknik, styrke og progression",
      "Kan bookes enkeltvis",
    ],
  },
  {
    id: "online",
    kind: "program",
    bookingType: "inquiry",
    label: "Online",
    name: "Online Coaching",
    tagline: "Løbende månedligt forløb",
    description:
      "Et løbende online forløb med personligt træningsprogram, kostplan og opfølgning. Du træner selv — jeg sørger for planen, justeringerne og at det passer til din hverdag.",
    fits: "Til dig, der vil have løbende hjælp og accountability.",
    sessions: 1,
    durationMinutes: 45,
    price: 799,
    pricePrefix: "Fra ",
    priceSuffix: "/md.",
    priceNote: "Opsiges måneden ud",
    badge: "Mest populære",
    emphasis: "premium",
    cta: "Start online coaching",
    perks: [
      "Personligt træningsprogram",
      "Kostplan",
      "Ugentlige check-ins",
      "Feedback og opfølgning",
      "Løbende justeringer",
      "Tilpasning efter dine resultater og hverdag",
    ],
  },
];

export function getProduct(id: string) {
  return products.find((product) => product.id === id);
}

export function requiresTimeslot(product: Product) {
  return product.bookingType === "session";
}
