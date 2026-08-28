import { sessionDuration } from "@/lib/commerce";

export type ProductKind = "session" | "pack" | "program";
export type ProductEmphasis = "simple" | "featured" | "premium";
export type BookingType = "session" | "pack" | "inquiry";

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
      "Send en forespørgsel med dato og tid i Viborg Fitness Gym, Falkevej 16B",
      `Sessionen varer som udgangspunkt ca. ${sessionDuration.minutes} minutter og er 1:1`,
      "Vi træner teknik, styrke og det, du gerne vil opnå",
      "Jeg vender tilbage med bekræftelse og betalingsinfo — tiden gælder, når den er bekræftet",
    ],
    sessions: 1,
    durationMinutes: sessionDuration.minutes,
    price: 300,
    priceNote: "pr. session",
    emphasis: "simple",
    cta: "Book personlig træning",
    perks: [
      "1:1 personlig træning",
      `Ca. ${sessionDuration.minutes} minutter`,
      "Fokus på teknik, styrke og progression",
      "Gennemgang, så du ved, hvad næste skridt er",
      "Kan bookes enkeltvis",
    ],
  },
  {
    id: "pack-5",
    kind: "pack",
    bookingType: "pack",
    label: "Klippekort",
    name: "5 træninger",
    tagline: "Personlig træning i Viborg",
    description:
      "Fem 1:1-sessioner i Viborg Fitness Gym. Du vælger ikke tid nu — tider bookes, når klippekortet er aktivt.",
    fits: "Til dig, der vil træne jævnligt uden at binde dig til et langt forløb.",
    how: [
      "Send en forespørgsel på 5 træninger — du vælger ikke tid nu",
      "Jeg vender tilbage med bekræftelse og betalingsinfo",
      `Hver session varer som udgangspunkt ca. ${sessionDuration.minutes} minutter`,
      "Når kortet er aktivt, booker du tider med dine klip",
    ],
    sessions: 5,
    durationMinutes: sessionDuration.minutes,
    price: 1350,
    priceNote: "270 kr. pr. træning · spar 150 kr.",
    badge: "Spar 150 kr.",
    popular: true,
    emphasis: "featured",
    cta: "Send forespørgsel",
    perks: [
      "5 × 1:1 personlig træning",
      "270 kr. pr. træning",
      "150 kr. under 5 enkeltbookinger",
      "Book tider, når det passer",
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

export function isPaidProduct(product: Product) {
  return product.bookingType === "session" || product.bookingType === "pack";
}

export function sessionProducts() {
  return products.filter((product) => product.kind !== "program");
}

export function programProducts() {
  return products.filter((product) => product.kind === "program");
}

export function trackEventForProduct(productId: string) {
  return productId === "online" ? "coaching_cta_clicked" : "pt_cta_clicked";
}

/** Server-side price in øre. Never accept an amount from the client. */
export function getCheckoutAmountOre(productId: string) {
  const product = getProduct(productId);
  if (!product || !isPaidProduct(product) || product.price == null) return null;
  return Math.round(product.price * 100);
}

export function resolveCheckoutAmountOre(productId: string, _clientAmount?: number) {
  void _clientAmount;
  return getCheckoutAmountOre(productId);
}
