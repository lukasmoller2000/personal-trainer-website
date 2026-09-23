import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { companyAddressLines } from "./commerce";
import { getPrivacyCopy, getTermsCopy } from "./legal";

describe("terms copy", () => {
  it("renders company info with legal address and training venue kept separate", () => {
    const terms = getTermsCopy();

    assert.equal(terms.cvr, "46738527");
    assert.equal(terms.address, "Hedevænget 95, 8800 Viborg");
    assert.deepEqual(companyAddressLines(terms.address), [
      "Hedevænget 95",
      "8800 Viborg",
    ]);
    assert.doesNotMatch(terms.address, /Falkevej/);
    assert.match(terms.trainingAddress, /Falkevej 16B/);
    assert.match(terms.trainingVenue, /Viborg Fitness Gym/);
    assert.equal(terms.companyName, "Lukas Møller");
    assert.ok(terms.email.includes("@"));
    assert.match(terms.phone, /25 89 04 53/);
    assert.doesNotMatch(JSON.stringify(terms), /TODO/i);
    assert.doesNotMatch(terms.trainingAddress, /CVR/);
    assert.doesNotMatch(terms.trainingAddress, /Hedevænget/);
  });

  it("shows 12-month clip expiry when config is set and 24-hour cancellation", () => {
    const previous = process.env.CLIP_EXPIRY_MONTHS;
    try {
      process.env.CLIP_EXPIRY_MONTHS = "12";
      const terms = getTermsCopy();
      assert.equal(terms.clipExpiryMonths, 12);
      assert.match(terms.clipExpiry, /12 måneder/);
      assert.equal(terms.cancellationHours, 24);
      assert.match(terms.cancellation, /24 timer/);
      assert.match(terms.cancellation, /kun for bekræftede tider/);
    } finally {
      if (previous === undefined) delete process.env.CLIP_EXPIRY_MONTHS;
      else process.env.CLIP_EXPIRY_MONTHS = previous;
    }
  });

  it("states late cancel and no-show as used-as-a-starting-point, not absolute forfeiture", () => {
    const terms = getTermsCopy();
    assert.match(terms.lateCancel, /bekræftet PT-session/);
    assert.match(terms.lateCancel, /som udgangspunkt som brugt/);
    assert.match(terms.lateCancel, /ét klip/);
    assert.match(terms.lateCancel, /som udgangspunkt ikke/);
    assert.match(terms.lateCancel, /ufravigelige rettigheder/);
    assert.match(terms.noShow, /samme udgangspunkt som sent afbud/);
    assert.match(terms.noShow, /ét klip/);
    assert.doesNotMatch(terms.lateCancel, /under ingen omstændigheder/);
    assert.doesNotMatch(terms.noShow, /mister altid/);
  });

  it("has no general ingen-refundering rule", () => {
    const terms = getTermsCopy();
    const blob = `${terms.refund} ${terms.lateCancel} ${terms.noShow}`;
    assert.match(terms.refund, /lovbestemte rettigheder/);
    assert.match(terms.refund, /afbuds- og klipvilkår/);
    assert.doesNotMatch(blob, /ingen refundering/i);
    assert.doesNotMatch(terms.refund, /aldrig refunderes/);
  });

  it("explains 14-day withdrawal for online service purchase without auto-waiver", () => {
    const terms = getTermsCopy();
    assert.equal(terms.withdrawalDays, 14);
    assert.match(terms.withdrawal, /14 dages fortrydelsesret/);
    assert.match(terms.withdrawal, /online køb af tjenesteydelser/);
    assert.match(terms.withdrawal, /bortfalder ikke automatisk/);
    assert.match(terms.withdrawal, /udtrykkelige ønske/);
    assert.doesNotMatch(terms.withdrawal, /fortrydes altid/);
    assert.doesNotMatch(terms.withdrawal, / mister automatisk /);
    assert.doesNotMatch(terms.withdrawal, /fraskrevet/);
  });

  it("keeps the payments flag off by default and does not block a later online-cancel path", () => {
    const terms = getTermsCopy();
    assert.equal(terms.paymentsEnabled, false);
    assert.match(terms.inquiryNotAgreement, /ikke en endelig aftale/);
    assert.doesNotMatch(terms.inquiryNotAgreement, /hvis betaling er slået til/);
    assert.match(terms.online, /forespørgsel/);
    assert.match(terms.online, /skrive eller ringe/);
    assert.match(terms.online, /opsige online/);
    assert.equal(terms.onlineCancelRequiredIfSubscription, true);
    assert.doesNotMatch(terms.online, /kan ikke opsiges/);
  });

  it("describes live Stripe payment and VFG member-price verification", () => {
    const terms = getTermsCopy();
    const blob = JSON.stringify(terms);

    assert.match(terms.payment, /Betaling kan ske via Stripe/);
    assert.match(terms.payment, /Stripe behandler dine betalingsoplysninger/);
    assert.match(terms.payment, /gemmer ikke fulde kortoplysninger/);
    assert.match(terms.memberPrice, /aktivt medlemskab/);
    assert.match(terms.memberPrice, /tjekkes ved betaling/);
    assert.match(terms.memberPrice, /standardprisen/);
    assert.match(terms.prices, /VFG-medlem: 250 kr/);
    assert.match(terms.prices, /VFG-medlem: 1150 kr/);
    assert.doesNotMatch(blob, /ikke slået til/);
    assert.doesNotMatch(blob, /aktiv webshop/);
  });
});

describe("privacy copy", () => {
  it("describes Stripe payment and VFG lookup without saying the shop is inactive", () => {
    const privacy = getPrivacyCopy();
    const blob = JSON.stringify(privacy);

    assert.equal(privacy.cvr, "46738527");
    assert.equal(privacy.address, "Hedevænget 95, 8800 Viborg");
    assert.doesNotMatch(privacy.address, /Falkevej/);
    assert.match(privacy.trainingAddress, /Falkevej 16B/);
    assert.match(privacy.venueNote, /træningssted/);
    assert.match(privacy.venueNote, /Falkevej 16B/);
    assert.doesNotMatch(privacy.venueNote, /Hedevænget/);
    assert.match(privacy.payment, /Betaling kan ske via Stripe/);
    assert.match(privacy.payment, /Stripe behandler dine betalingsoplysninger/);
    assert.match(privacy.payment, /gemmer ikke fulde kortoplysninger/);
    assert.match(privacy.payment, /bogføring, dokumentation/);
    assert.match(privacy.membership, /email/);
    assert.match(privacy.membership, /telefonnummer/);
    assert.match(privacy.membership, /Viborg Fitness Gym/);
    assert.match(privacy.membership, /berettiget eller ej/);
    assert.match(privacy.membership, /ikke hele medlemsprofilen/);
    assert.match(privacy.membership, /standardprisen/);
    assert.match(privacy.processors, /Stripe/);
    assert.match(privacy.processors, /Viborg Fitness Gym/);
    assert.match(privacy.processors, /Neon/);
    assert.match(privacy.processors, /Resend/);
    assert.match(privacy.processors, /Vercel/);
    assert.doesNotMatch(blob, /aktiv webshop/);
    assert.doesNotMatch(blob, /ikke slået til/);
    assert.doesNotMatch(blob, /Fremtidig betaling/);
    assert.doesNotMatch(blob, /TODO/i);
    assert.doesNotMatch(blob, /Lenus/i);
    assert.doesNotMatch(blob, /Apple Health/);
    assert.doesNotMatch(blob, /Google Fit/);
    assert.doesNotMatch(blob, /gruppechat/i);
    assert.doesNotMatch(blob, /App Store/);
  });

  it("explains that free-text can be health data and limits the purpose", () => {
    const privacy = getPrivacyCopy();

    assert.match(privacy.healthData, /helbredsoplysninger/);
    assert.match(privacy.healthData, /særlige kategorier/);
    assert.match(privacy.healthData, /skader, sygdom, medicin, vægt, kost/);
    assert.match(privacy.healthUse, /kun, hvis det er nødvendigt for at tilpasse træning eller coaching/);
    assert.match(privacy.healthUse, /ikke til markedsføring, profilering eller andre formål/);
    assert.match(privacy.healthUse, /særskilt, udtrykkeligt samtykke/);
    assert.match(privacy.legalBasis, /art\. 6, stk\. 1, litra b/);
    assert.match(privacy.legalBasis, /art\. 6, stk\. 1, litra c/);
    assert.match(privacy.legalBasis, /GDPR art\. 9, stk\. 2, litra a/);
    assert.match(privacy.legalBasis, /kun for at tilpasse træning eller coaching/);
    assert.match(privacy.healthWithdrawal, /trække dit udtrykkelige samtykke/);
    assert.match(privacy.healthWithdrawal, /skrive til/);
    assert.match(privacy.healthWithdrawal, /stopper den fremtidige behandling/);
    assert.match(privacy.healthWithdrawal, /ændrer ikke lovligheden/);
    assert.match(privacy.healthWithdrawal, /slettes eller anonymiseres/);
    assert.match(privacy.healthWithdrawal, /ikke en automatisk slettefunktion/);
    assert.match(privacy.healthGate, /ikke en fuldstændig klassificering/);
    assert.match(privacy.healthGate, /ekstra værn/);
    assert.match(privacy.healthGate, /vægttab/);
    assert.match(privacy.healthGate, /tabe fedt/);
    assert.match(privacy.healthGate, /ikke at skrive helbredsoplysninger uden samtykke/);
    assert.doesNotMatch(privacy.healthData, /beder ikke om helbredsoplysninger/);
    assert.doesNotMatch(privacy.healthWithdrawal, /fortrydelsesret/);
    assert.doesNotMatch(privacy.healthGate, /fortrydelsesret/);
    assert.doesNotMatch(privacy.healthUse, /nyhedsbrev/);
  });

  it("states concrete retention criteria without invented product processors", () => {
    const privacy = getPrivacyCopy();
    const retention = [privacy.retention, ...privacy.retentionItems].join(" ");
    const processors = [privacy.processors, ...privacy.processorItems].join(" ");

    assert.match(retention, /5 år efter udløbet af det regnskabsår/);
    assert.match(retention, /bogføringsloven/);
    assert.match(retention, /\d+ måneder fra køb/);
    assert.match(retention, /ikke længere end nødvendigt for at tilpasse træning eller coaching/);
    assert.match(retention, /ikke sat en automatisk slettefrist for helbredsoplysninger/);
    assert.match(retention, /indtil det ikke længere er nødvendigt efter seneste session/);
    const healthRetention = privacy.retentionItems.find((item) => item.includes("Helbredsoplysninger"));
    assert.ok(healthRetention);
    assert.doesNotMatch(healthRetention, /6 måneder|12 måneder|36 måneder/);
    assert.doesNotMatch(privacy.healthWithdrawal, /6 måneder|12 måneder|36 måneder/);
    assert.match(privacy.membership, /server-til-server/);
    assert.match(processors, /PostgreSQL hos Neon/);
    assert.match(processors, /ikke hele medlemsprofilen/);
  });
});

describe("legal page consistency", () => {
  it("keeps terms and privacy aligned on company, Stripe, VFG and health", () => {
    const terms = getTermsCopy();
    const privacy = getPrivacyCopy();

    assert.equal(terms.cvr, privacy.cvr);
    assert.equal(terms.address, privacy.address);
    assert.equal(terms.email, privacy.email);
    assert.equal(terms.phone, privacy.phone);
    assert.equal(terms.trainingAddress, privacy.trainingAddress);
    assert.match(terms.payment, /Betaling kan ske via Stripe/);
    assert.match(privacy.payment, /Betaling kan ske via Stripe/);
    assert.match(terms.memberPrice, /standardprisen/);
    assert.match(privacy.membership, /standardprisen/);
    assert.match(privacy.healthData, /helbredsoplysninger/);
    assert.match(terms.healthDisclaimer, /ikke lægelig rådgivning/);
    assert.doesNotMatch(terms.address, /Falkevej/);
    assert.match(terms.trainingAddress, /Falkevej 16B/);
  });
});

describe("terms health disclaimer", () => {
  it("states a short health disclaimer without waiving consumer rights", () => {
    const terms = getTermsCopy();
    const blob = JSON.stringify(terms);

    assert.match(terms.healthDisclaimer, /ikke lægelig rådgivning/);
    assert.match(terms.healthDisclaimer, /skader, sygdom eller andet helbred/);
    assert.match(terms.healthDisclaimer, /læge eller andet relevant sundhedspersonale/);
    assert.match(terms.healthDisclaimer, /alvorligt ubehag eller smerter/);
    assert.match(terms.liability, /sygdom eller force majeure/);
    assert.match(terms.liability, /ufravigelige rettigheder som forbruger/);
    assert.doesNotMatch(terms.liability, /på eget ansvar/);
    assert.doesNotMatch(blob, /Lenus/i);
    assert.doesNotMatch(blob, /Apple Health/);
    assert.doesNotMatch(blob, /Google Fit/);
  });
});
