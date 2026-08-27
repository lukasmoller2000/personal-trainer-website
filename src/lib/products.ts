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
  how: string[];
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
    tagline: "1:1 i Viborg",
    description:
      "1:1 træning med mig i Viborg Fitness Gym. Vi arbejder med teknik, styrke, progression og dine konkrete mål.",
    fits: "Til dig, der vil træne sammen med mig i gymmet — én session ad gangen, uden binding.",
    how: [
      "Book en tid i Viborg Fitness Gym, Falkevej 16B",
      "Sessionen varer 60 minutter og er 1:1",
      "Vi træner teknik, styrke og det, du gerne vil opnå",
      "Jeg bekræfter tiden og sender betalingsinfo",
    ],
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
    fits: "Til dig, der vil have løbende hjælp og accountability — uanset hvor du træner.",
    how: [
      "Send en forespørgsel — du vælger ikke tid i gymmet",
      "Vi aftaler opstart",
      "Du får program, kostplan og ugentlige check-ins",
      "Forløbet kører måned for måned og opsiges måneden ud",
    ],
    sessions: 1,
    durationMinutes: 45,
    price: 799,
    priceSuffix: "/md.",
    priceNote: "Opsiges måneden ud",
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

export function trackEventForProduct(productId: string) {
  return productId === "online" ? "coaching_cta_clicked" : "pt_cta_clicked";
}
