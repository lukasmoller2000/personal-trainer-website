/**
 * Minimal GDPR Art. 9(2)(a) consent for voluntary health free-text.
 *
 * We do not ask for illness or medicine. Ordinary booking/contact without
 * health notes must stay possible. Consent is a separate, unchecked box —
 * not terms, not withdrawal, not marketing.
 *
 * Keyword detection is extra security only:
 * - It is not a complete classification of health data.
 * - It is only a conservative extra guard.
 * - It does not replace consent, legal copy, or data minimization.
 * - There is no AI classifier and no external text analysis.
 *
 * False positives must not block ordinary goals like "tabe fedt" /
 * "komme i form" / standalone "vægttab". Obvious health/medical terms are
 * always gated. Standalone "vægt"/"kost" are not gated — only a few
 * clinical weight/diet terms. Notes like "vægt pga sygdom" are already
 * caught by the medical keyword. Compounds like "knæskade" match via
 * substring for keywords of 5+ letters. Short tokens use word boundaries only.
 *
 * Client and server MUST use this module. Do not duplicate the lists.
 */

export const HEALTH_CONSENT_VERSION = "health-consent-v1";

export const HEALTH_CONSENT = {
  defaultChecked: false as const,
  version: HEALTH_CONSENT_VERSION,
  purpose: "tilpasse træning/coaching",
  checkboxLabel:
    "Jeg giver udtrykkeligt samtykke til, at oplysninger om mit helbred, som jeg selv vælger at skrive i formularen, må behandles med det formål at tilpasse min træning/coaching. Jeg kan til enhver tid trække samtykket tilbage.",
  help: "Samtykket er frivilligt og gælder kun, hvis du selv skriver om helbred. Det bruges ikke til markedsføring.",
  fieldHint:
    "Undlad helbredsoplysninger her, medmindre du har givet samtykke nedenfor.",
  requiredError:
    "Hvis du skriver om helbred (fx skade, sygdom, medicin eller smerte), skal du enten sætte kryds i samtykket eller fjerne de oplysninger.",
} as const;

/**
 * Obvious Danish health/medical status terms — always gated.
 * Excluded on purpose as standalone tokens: vægt, vægttab, kost, fedt, form,
 * styrke, knæ, ryg (ordinary training goals / isolated body parts).
 */
export const HEALTH_KEYWORDS = [
  "skade",
  "skadet",
  "skader",
  "sygdom",
  "sygdomme",
  "syg",
  "medicin",
  "medicinsk",
  "smerte",
  "smerter",
  "diagnose",
  "diagnosticeret",
  "helbred",
  "operation",
  "opereret",
  "recept",
  "fysioterapi",
  "fysioterapeut",
  "diskusprolaps",
  "menisk",
  "korsbånd",
  "slidgigt",
  "gigt",
  "diabetes",
  "astma",
  "forstuvet",
  "forstuvning",
  "brækket",
  "betændelse",
  "infektion",
  "graviditet",
  "gravid",
  "iskias",
  "migræne",
  "depression",
  "sygehus",
  "hospital",
  "læge",
  "lægen",
] as const;

/**
 * Clinical weight/diet terms only. Ordinary goals ("vægttab", "tabe fedt",
 * "tabe vægt", "bedre kost", "komme i form") stay ungated.
 */
export const HEALTH_WEIGHT_DIET_KEYWORDS = [
  "spiseforstyrrelse",
  "anoreksi",
  "bulimi",
  "undervægt",
] as const;

/** Multi-word phrases that are clearly health-related. */
export const HEALTH_PHRASES = ["ondt i"] as const;

const MIN_SUBSTRING_LENGTH = 5;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasKeyword(normalized: string, keyword: string) {
  const escaped = escapeRegex(keyword);
  const word = new RegExp(`(^|[^\\p{L}])${escaped}([^\\p{L}]|$)`, "u");
  if (word.test(normalized)) return true;
  return keyword.length >= MIN_SUBSTRING_LENGTH && normalized.includes(keyword);
}

export function looksLikeHealthData(text: string): boolean {
  const normalized = text.toLowerCase().normalize("NFC");
  if (!normalized.trim()) return false;

  for (const phrase of HEALTH_PHRASES) {
    if (normalized.includes(phrase)) return true;
  }

  for (const keyword of HEALTH_KEYWORDS) {
    if (hasKeyword(normalized, keyword)) return true;
  }
  for (const keyword of HEALTH_WEIGHT_DIET_KEYWORDS) {
    if (hasKeyword(normalized, keyword)) return true;
  }

  return false;
}

export function readHealthConsent(body: Record<string, unknown>): boolean {
  return body.healthConsent === true;
}

export function evaluateHealthConsent(input: {
  texts: Array<string | null | undefined>;
  consent: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (input.consent) return { ok: true };
  const combined = input.texts.filter((value): value is string => Boolean(value)).join("\n");
  if (looksLikeHealthData(combined)) {
    return { ok: false, error: HEALTH_CONSENT.requiredError };
  }
  return { ok: true };
}

export function healthConsentWrite(consent: boolean, at = new Date()) {
  if (!consent) {
    return { healthConsentAt: null as Date | null, healthConsentVersion: null as string | null };
  }
  return {
    healthConsentAt: at,
    healthConsentVersion: HEALTH_CONSENT_VERSION,
  };
}

/** Existing rows with null/missing fields are never consented. Both fields required. */
export function hasRecordedHealthConsent(input: {
  healthConsentAt?: Date | string | null;
  healthConsentVersion?: string | null;
}): input is { healthConsentAt: Date | string; healthConsentVersion: string } {
  if (!input.healthConsentAt || !input.healthConsentVersion) return false;
  if (typeof input.healthConsentAt === "string" && !input.healthConsentAt.trim()) return false;
  if (!input.healthConsentVersion.trim()) return false;
  return true;
}

export function healthConsentEmailLine(input: {
  healthConsentAt?: Date | string | null;
  healthConsentVersion?: string | null;
}) {
  if (!hasRecordedHealthConsent(input)) return null;
  const at =
    typeof input.healthConsentAt === "string"
      ? input.healthConsentAt
      : input.healthConsentAt.toISOString();
  return `Helbredssamtykke: ${input.healthConsentVersion} · ${HEALTH_CONSENT.purpose} · ${at}`;
}
