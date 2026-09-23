import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  evaluateHealthConsent,
  hasRecordedHealthConsent,
  HEALTH_CONSENT,
  HEALTH_CONSENT_VERSION,
  HEALTH_KEYWORDS,
  HEALTH_WEIGHT_DIET_KEYWORDS,
  healthConsentEmailLine,
  healthConsentWrite,
  looksLikeHealthData,
  readHealthConsent,
} from "./health-consent";

const HEALTH_CONSENT_SOURCE = readFileSync("src/lib/health-consent.ts", "utf8");
const MIGRATION_SQL = readFileSync(
  "prisma/migrations/20260923120000_health_consent/migration.sql",
  "utf8"
);
const SCHEMA = readFileSync("prisma/schema.prisma", "utf8");

describe("health consent checkbox", () => {
  it("is not pre-checked and is not marketing, terms or withdrawal", () => {
    assert.equal(HEALTH_CONSENT.defaultChecked, false);
    assert.match(HEALTH_CONSENT.checkboxLabel, /udtrykkeligt samtykke/);
    assert.match(HEALTH_CONSENT.checkboxLabel, /helbred/);
    assert.match(HEALTH_CONSENT.checkboxLabel, /tilpasse min træning\/coaching/);
    assert.match(HEALTH_CONSENT.checkboxLabel, /trække samtykket tilbage/);
    assert.match(HEALTH_CONSENT.help, /ikke til markedsføring/);
    assert.match(HEALTH_CONSENT.fieldHint, /Undlad helbredsoplysninger her/);
    assert.match(HEALTH_CONSENT.fieldHint, /samtykke nedenfor/);
    assert.doesNotMatch(HEALTH_CONSENT.checkboxLabel, /nyhedsbrev/);
    assert.doesNotMatch(HEALTH_CONSENT.checkboxLabel, /handelsbetingelser/);
    assert.doesNotMatch(HEALTH_CONSENT.checkboxLabel, /fortrydelsesret/);
    assert.doesNotMatch(HEALTH_CONSENT.checkboxLabel, /markedsføring/);
    assert.doesNotMatch(HEALTH_CONSENT.help, /nyhedsbrev/);
    assert.doesNotMatch(HEALTH_CONSENT.help, /fortrydelsesret/);
    assert.doesNotMatch(HEALTH_CONSENT.fieldHint, /fortrydelsesret/);
    assert.doesNotMatch(HEALTH_CONSENT.fieldHint, /nyhedsbrev/);
  });

  it("keeps the checkbox as its own control in booking and contact forms", () => {
    const wizard = readFileSync("src/components/booking/BookingWizard.tsx", "utf8");
    const contact = readFileSync("src/components/sections/ContactForm.tsx", "utf8");
    const checkbox = readFileSync("src/components/ui/HealthConsentCheckbox.tsx", "utf8");

    assert.match(wizard, /HealthConsentCheckbox/);
    assert.match(contact, /HealthConsentCheckbox/);
    assert.match(wizard, /HEALTH_CONSENT\.defaultChecked/);
    assert.match(contact, /HEALTH_CONSENT\.defaultChecked/);
    assert.match(checkbox, /data-testid="health-consent"/);
    assert.doesNotMatch(checkbox, /defaultChecked=\{true\}/);
    assert.doesNotMatch(checkbox, /early-performance/);
    assert.doesNotMatch(checkbox, /nyhedsbrev/);
    assert.doesNotMatch(checkbox, /fortrydelsesret/);
    assert.doesNotMatch(checkbox, /handelsbetingelser/);
  });

  it("shows short helper text at goal, notes and message fields", () => {
    const wizard = readFileSync("src/components/booking/BookingWizard.tsx", "utf8");
    const contact = readFileSync("src/components/sections/ContactForm.tsx", "utf8");
    const field = readFileSync("src/components/ui/Field.tsx", "utf8");

    assert.match(wizard, /HEALTH_CONSENT\.fieldHint/);
    assert.match(contact, /HEALTH_CONSENT\.fieldHint/);
    assert.match(wizard, /id="goal"/);
    assert.match(wizard, /booking-notes/);
    assert.match(contact, /id="message"/);
    assert.match(field, /data-testid="health-field-hint"/);
    assert.doesNotMatch(wizard, /role="alert"[^>]*>[\s\S]*fieldHint/);
    assert.doesNotMatch(contact, /advarselsboks|warning box/i);
  });

  it("enforces the gate on the server for booking, contact, checkout and clip-card notes", () => {
    for (const file of [
      "src/app/api/bookings/route.ts",
      "src/app/api/contact/route.ts",
      "src/app/api/checkout/route.ts",
      "src/app/api/clip-cards/book/route.ts",
    ]) {
      const source = readFileSync(file, "utf8");
      assert.match(source, /evaluateHealthConsent/);
      assert.match(source, /readHealthConsent/);
      assert.match(source, /healthConsentWrite/);
      assert.match(source, /from "@\/lib\/health-consent"/);
    }
  });

  it("uses one shared keyword list on client and server", () => {
    const wizard = readFileSync("src/components/booking/BookingWizard.tsx", "utf8");
    const contact = readFileSync("src/components/sections/ContactForm.tsx", "utf8");
    assert.match(wizard, /evaluateHealthConsent/);
    assert.match(contact, /evaluateHealthConsent/);
    assert.match(wizard, /from "@\/lib\/health-consent"/);
    assert.match(contact, /from "@\/lib\/health-consent"/);
    assert.equal(HEALTH_CONSENT_SOURCE.includes("HEALTH_KEYWORDS"), true);
    assert.doesNotMatch(wizard, /const HEALTH_KEYWORDS/);
    assert.doesNotMatch(contact, /const HEALTH_KEYWORDS/);
  });
});

describe("conservative health keyword gate", () => {
  it("documents that detection is extra security only — not a complete classifier", () => {
    assert.match(HEALTH_CONSENT_SOURCE, /extra security only/i);
    assert.match(HEALTH_CONSENT_SOURCE, /not a complete classification of health data/i);
    assert.match(HEALTH_CONSENT_SOURCE, /conservative extra guard/i);
    assert.match(HEALTH_CONSENT_SOURCE, /does not replace consent/i);
    assert.match(HEALTH_CONSENT_SOURCE, /no AI classifier/i);
    assert.match(HEALTH_CONSENT_SOURCE, /no external text analysis/i);
    assert.doesNotMatch(HEALTH_CONSENT_SOURCE, /openai|anthropic|classifier api/i);
  });

  it("does not treat ordinary fitness goals as health data", () => {
    for (const text of [
      "tabe fedt",
      "komme i form",
      "styrke",
      "vægttab",
      "tabe vægt",
      "bedre kost",
      "kostplan",
      "mere energi",
      "bedre teknik",
      "træne knæ og ryg",
    ]) {
      assert.equal(looksLikeHealthData(text), false, text);
    }
  });

  it("flags obvious health terms including Danish compounds", () => {
    for (const text of [
      "jeg har en skade",
      "knæskade",
      "smerter i skulderen",
      "jeg tager medicin",
      "ondt i ryggen",
      "min læge sagde",
      "diskusprolaps",
      "diagnose",
      "sygdom",
    ]) {
      assert.equal(looksLikeHealthData(text), true, text);
    }
  });

  it("gates clinical weight/diet terms but not ordinary vægt/kost goals", () => {
    for (const text of ["spiseforstyrrelse", "anoreksi", "bulimi", "undervægt", "undervægtig"]) {
      assert.equal(looksLikeHealthData(text), true, text);
    }
    for (const text of ["vægt", "kost", "vægttab", "tabe vægt", "tabe fedt", "bedre kost"]) {
      assert.equal(looksLikeHealthData(text), false, text);
    }
    assert.ok(HEALTH_WEIGHT_DIET_KEYWORDS.includes("spiseforstyrrelse"));
    assert.ok(!HEALTH_KEYWORDS.includes("vægt" as (typeof HEALTH_KEYWORDS)[number]));
    assert.ok(!HEALTH_KEYWORDS.includes("kost" as (typeof HEALTH_KEYWORDS)[number]));
  });

  it("allows booking without consent when there is no health text", () => {
    const result = evaluateHealthConsent({
      texts: ["komme i form", "træner helst om morgenen", "vægttab"],
      consent: false,
    });
    assert.equal(result.ok, true);
  });

  it("requires consent when health-like text is present", () => {
    const blocked = evaluateHealthConsent({
      texts: ["jeg har en knæskade"],
      consent: false,
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.equal(blocked.error, HEALTH_CONSENT.requiredError);
      assert.match(blocked.error, /sætte kryds|fjerne/);
    }

    const allowed = evaluateHealthConsent({
      texts: ["jeg har en knæskade"],
      consent: true,
    });
    assert.equal(allowed.ok, true);
  });

  it("requires consent for clinical weight/diet notes", () => {
    const blocked = evaluateHealthConsent({
      texts: ["jeg har en spiseforstyrrelse"],
      consent: false,
    });
    assert.equal(blocked.ok, false);

    const allowed = evaluateHealthConsent({
      texts: ["jeg har en spiseforstyrrelse"],
      consent: true,
    });
    assert.equal(allowed.ok, true);
  });
});

describe("health consent documentation", () => {
  it("stores timestamp and version only when consent is given", () => {
    const at = new Date("2026-09-23T10:00:00.000Z");
    const given = healthConsentWrite(true, at);
    assert.equal(given.healthConsentAt?.toISOString(), "2026-09-23T10:00:00.000Z");
    assert.equal(given.healthConsentVersion, HEALTH_CONSENT_VERSION);
    assert.match(HEALTH_CONSENT.purpose, /tilpasse/);

    const refused = healthConsentWrite(false, at);
    assert.equal(refused.healthConsentAt, null);
    assert.equal(refused.healthConsentVersion, null);
    assert.equal(hasRecordedHealthConsent(refused), false);
    assert.equal(hasRecordedHealthConsent(given), true);
  });

  it("reads only an explicit boolean true as consent", () => {
    assert.equal(readHealthConsent({ healthConsent: true }), true);
    assert.equal(readHealthConsent({ healthConsent: false }), false);
    assert.equal(readHealthConsent({ healthConsent: "true" }), false);
    assert.equal(readHealthConsent({ healthConsent: 1 }), false);
    assert.equal(readHealthConsent({}), false);
  });

  it("treats existing rows with null consent fields as not consented", () => {
    assert.equal(hasRecordedHealthConsent({}), false);
    assert.equal(hasRecordedHealthConsent({ healthConsentAt: null, healthConsentVersion: null }), false);
    assert.equal(
      hasRecordedHealthConsent({ healthConsentAt: "2026-09-23T10:00:00.000Z", healthConsentVersion: null }),
      false
    );
    assert.equal(
      hasRecordedHealthConsent({ healthConsentAt: null, healthConsentVersion: HEALTH_CONSENT_VERSION }),
      false
    );
    assert.equal(
      hasRecordedHealthConsent({ healthConsentAt: "", healthConsentVersion: HEALTH_CONSENT_VERSION }),
      false
    );
    assert.equal(healthConsentEmailLine({ healthConsentAt: null, healthConsentVersion: null }), null);
    assert.equal(healthConsentEmailLine({}), null);
  });

  it("formats an email audit line with version, purpose and timestamp", () => {
    const line = healthConsentEmailLine({
      healthConsentAt: "2026-09-23T10:00:00.000Z",
      healthConsentVersion: HEALTH_CONSENT_VERSION,
    });
    assert.equal(
      line,
      "Helbredssamtykke: health-consent-v1 · tilpasse træning/coaching · 2026-09-23T10:00:00.000Z"
    );
    assert.equal(healthConsentEmailLine({}), null);
  });
});

describe("health consent migration", () => {
  it("is additive only: nullable columns, no defaults, no backfill", () => {
    assert.match(MIGRATION_SQL, /ALTER TABLE "Booking" ADD COLUMN "healthConsentAt" TIMESTAMP\(3\);/);
    assert.match(MIGRATION_SQL, /ALTER TABLE "Booking" ADD COLUMN "healthConsentVersion" TEXT;/);
    assert.match(MIGRATION_SQL, /ALTER TABLE "Order" ADD COLUMN "healthConsentAt" TIMESTAMP\(3\);/);
    assert.match(MIGRATION_SQL, /ALTER TABLE "Order" ADD COLUMN "healthConsentVersion" TEXT;/);
    assert.match(MIGRATION_SQL, /ALTER TABLE "ContactMessage" ADD COLUMN "healthConsentAt" TIMESTAMP\(3\);/);
    assert.match(MIGRATION_SQL, /ALTER TABLE "ContactMessage" ADD COLUMN "healthConsentVersion" TEXT;/);
    const sqlOnly = MIGRATION_SQL.replace(/--.*$/gm, "");
    assert.doesNotMatch(sqlOnly, /DROP /i);
    assert.doesNotMatch(sqlOnly, /DELETE /i);
    assert.doesNotMatch(sqlOnly, /UPDATE /i);
    assert.doesNotMatch(sqlOnly, /NOT NULL/);
    assert.doesNotMatch(sqlOnly, /DEFAULT /i);
    assert.match(MIGRATION_SQL, /Existing Booking\/Order\/ContactMessage rows stay NULL/);

    assert.match(SCHEMA, /model Booking \{[\s\S]*healthConsentAt\s+DateTime\?/);
    assert.match(SCHEMA, /model Booking \{[\s\S]*healthConsentVersion\s+String\?/);
    assert.match(SCHEMA, /model Order \{[\s\S]*healthConsentAt\s+DateTime\?/);
    assert.match(SCHEMA, /model ContactMessage \{[\s\S]*healthConsentAt\s+DateTime\?/);
    assert.doesNotMatch(SCHEMA, /healthConsentAt\s+DateTime\s+@default/);
    assert.doesNotMatch(SCHEMA, /healthConsentVersion\s+String\s+@default/);
  });
});
