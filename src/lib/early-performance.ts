/**
 * Early-performance request shown before Checkout.
 * Default is unchecked. Cautious wording — not a withdrawal waiver.
 */
export const EARLY_PERFORMANCE_CONSENT = {
  defaultChecked: false as const,
  checkboxLabel:
    "Jeg ønsker, at leveringen kan begynde, før fortrydelsesfristen på 14 dage er udløbet.",
  help:
    "Det er en anmodning om tidlig opstart. De lovbestemte følger gælder. Det er ikke en fraskrivelse af fortrydelsesretten.",
} as const;
