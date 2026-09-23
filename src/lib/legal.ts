/**
 * Danish legal copy for /vilkaar and /privatliv, driven by commerce config.
 * COMPANY_CVR and COMPANY_ADDRESS come from getCompanyConfig().
 * Falkevej is the training venue only — never treat it as the legal address.
 */

import {
  DEFAULT_REFUND_POLICY,
  getCancellationHours,
  getClipExpiryMonths,
  getCompanyConfig,
  getRefundPolicy,
  getWithdrawalPeriodDays,
  isPaymentsEnabledByFlag,
  ONLINE_CANCEL_REQUIRED_IF_SUBSCRIPTION,
  sessionDuration,
} from "@/lib/commerce";
import { getProduct } from "@/lib/products";
import { siteConfig } from "@/lib/utils";

export function getTermsCopy() {
  const company = getCompanyConfig();
  const hours = getCancellationHours();
  const clipMonths = getClipExpiryMonths();
  const refundPolicy = getRefundPolicy();
  const withdrawalDays = getWithdrawalPeriodDays();
  const session = getProduct("session");
  const pack = getProduct("pack-5");
  const online = getProduct("online");

  const sessionPrice = session?.price ?? 300;
  const sessionMemberPrice = session?.memberPrice ?? 250;
  const packPrice = pack?.price ?? 1350;
  const packMemberPrice = pack?.memberPrice ?? 1150;
  const packPerSession =
    pack?.price != null && pack.sessions ? pack.price / pack.sessions : 270;
  const onlinePrice = online?.price ?? 799;

  const clipExpiry = `Klippekortet gælder ${clipMonths} måneder fra køb.`;

  const refund = refundPolicy || DEFAULT_REFUND_POLICY;

  return {
    companyName: company.name,
    tradeName: company.tradeName,
    cvr: company.cvr,
    address: company.address,
    email: company.email,
    phone: company.phone,
    trainingVenue: siteConfig.venue,
    trainingAddress: siteConfig.address,
    sessionPrice,
    sessionMemberPrice,
    packPrice,
    packMemberPrice,
    packPerSession,
    onlinePrice,
    paymentsEnabled: isPaymentsEnabledByFlag(),
    cancellationHours: hours,
    clipExpiryMonths: clipMonths,
    withdrawalDays,
    inquiryNotAgreement:
      "En bookingforespørgsel er ikke en endelig aftale. Den ønskede tid er et ønske, indtil jeg har bekræftet den. Først når tiden er bekræftet — og betaling er aftalt eller gennemført — gælder tiden som en aftalt session.",
    prices:
      `Enkelt personlig træning koster ${sessionPrice} kr. (VFG-medlem: ${sessionMemberPrice} kr.). Fem træninger koster ${packPrice} kr. (${packPerSession} kr. pr. træning; VFG-medlem: ${packMemberPrice} kr.). Online Coaching koster ${onlinePrice} kr. pr. måned. Den pris, du ser, er den pris, der gælder for ydelsen.`,
    memberPrice:
      "VFG-medlemspris forudsætter et aktivt medlemskab i Viborg Fitness Gym. Medlemsstatus tjekkes ved betaling. Hvis medlemskabet ikke kan bekræftes, gælder standardprisen.",
    payment:
      "Betaling kan ske via Stripe. Stripe behandler dine betalingsoplysninger. Siden gemmer ikke fulde kortoplysninger. Relevante ordre- og betalingsoplysninger kan gemmes til bogføring, dokumentation og for at levere ydelsen. For en enkelt PT-session betaler du via Stripe, efter jeg har bekræftet tiden. Klippekort kan betales direkte.",
    booking:
      "Enkelt PT: du angiver et ønsket tidspunkt i Viborg Fitness Gym. Klippekort til 5 træninger sendes uden tid — tider bookes, når kortet er aktivt. Online Coaching sendes som forespørgsel; opstart aftales.",
    cancellation: `Afbudsreglen på ${hours} timer gælder kun for bekræftede tider. Når en tid er bekræftet, kan du aflyse eller flytte gratis indtil ${hours} timer før start. Skriv til ${company.email} eller ring ${company.phone}. En forespørgsel, der ikke er bekræftet, er ikke omfattet af afbudsreglen.`,
    lateCancel: `Hvis du aflyser en bekræftet PT-session med mindre end ${hours} timers varsel, betragtes sessionen som udgangspunkt som brugt. Ved klippekort trækkes ét klip. Ved en enkelt betalt session refunderes betalingen som udgangspunkt ikke. Det berører ikke dine ufravigelige rettigheder som forbruger.`,
    noShow: `Udeblivelse fra en bekræftet PT-session behandles efter samme udgangspunkt som sent afbud: sessionen betragtes som brugt. Ved klippekort trækkes ét klip. Ved en enkelt betalt session refunderes betalingen som udgangspunkt ikke. Det berører ikke dine ufravigelige rettigheder som forbruger.`,
    clipCard:
      "Ved køb af 5 træninger får du et klippekort med tilsvarende saldo. Hver booket træning trækker ét klip. Du kan se, hvor mange træninger du har tilbage, når du booker.",
    clipExpiry,
    refund,
    withdrawal: `Ved online køb af tjenesteydelser har du som udgangspunkt ${withdrawalDays} dages fortrydelsesret efter forbrugeraftaleloven. Fortrydelsesretten bortfalder ikke automatisk, fordi ydelsen påbegyndes. Hvis du ønsker, at en betalt ydelse skal starte, før fortrydelsesfristen er udløbet, skal det ske efter dit udtrykkelige ønske. Eventuelt samtykke og oplysning herom indhentes i købsflowet, hvis det er påkrævet — det antages ikke automatisk. Ved kortbetaling beder vi dig bekræfte anmodningen om tidlig opstart, før du går til betaling. Det er ikke en fraskrivelse af fortrydelsesretten.`,
    online:
      "Online Coaching sendes i dag som forespørgsel. Forløbet er beskrevet som et løbende månedligt forløb, der opsiges måneden ud. Opsigelse sker ved at skrive eller ringe. Der sælges ikke et abonnement med automatisk fornyelse på siden nu. Hvis et løbende abonnement senere sælges online, skal kunden have en reel mulighed for at opsige online.",
    onlineCancelRequiredIfSubscription: ONLINE_CANCEL_REQUIRED_IF_SUBSCRIPTION,
    sessionDuration: sessionDuration.copy,
    sessionNotAPromise: sessionDuration.notAPromise,
    healthDisclaimer:
      "Personlig træning og online coaching er ikke lægelig rådgivning og erstatter ikke undersøgelse eller behandling hos læge eller andet sundhedspersonale. Fortæl mig om skader, sygdom eller andet helbred, der kan påvirke træningen, så jeg kan tilpasse forløbet. Er du i tvivl om, om aktiviteten er forsvarlig for dig, så spørg læge eller andet relevant sundhedspersonale, før du går i gang. Får du alvorligt ubehag eller smerter, skal du stoppe træningen og søge relevant hjælp.",
    liability:
      "Jeg kan aflyse ved sygdom eller force majeure og tilbyder i så fald en ny tid eller at lægge klippet tilbage. Det berører ikke dine ufravigelige rettigheder som forbruger.",
  };
}

export function getPrivacyCopy() {
  const company = getCompanyConfig();
  const clipMonths = getClipExpiryMonths();

  return {
    companyName: company.name,
    tradeName: company.tradeName,
    cvr: company.cvr,
    address: company.address,
    email: company.email,
    phone: company.phone,
    trainingVenue: siteConfig.venue,
    trainingAddress: siteConfig.address,
    controller: `${company.name} (${company.tradeName}) er dataansvarlig for de personoplysninger, du giver via hjemmesiden, herunder kontaktformular, booking og betaling.`,
    venueNote: `Personlig træning foregår i ${siteConfig.venue}, ${siteConfig.address} (træningssted — ikke nødvendigvis virksomhedens forretningsadresse).`,
    processingIntro:
      "Når du skriver, booker eller betaler via siden, behandler vi de oplysninger, der er nødvendige for at svare dig, aftale træning og gennemføre købet.",
    contactAndBooking:
      "Når du skriver via kontaktformularen, indsamler vi navn, email, telefonnummer og din besked. Når du sender en bookingforespørgsel — også til online coaching — indsamler vi navn, email, telefonnummer, dit mål og eventuelle bemærkninger. Ved enkelt PT kan du også angive et ønsket dato og tidspunkt. Det er et ønske, ikke en bekræftet reservation.",
    healthData:
      "Vi indsamler ikke CPR-nummer og har ikke særlige felter til helbred. Du kan selv skrive dit mål og eventuelle bemærkninger i booking og en fri besked i kontaktformularen. Skriver du om skader, sygdom, medicin, vægt, kost eller andet helbred, kan det være helbredsoplysninger (særlige kategorier af personoplysninger).",
    healthGate:
      "Et automatisk nøgleordstjek er kun et ekstra værn. Det er ikke en fuldstændig klassificering af helbredsoplysninger og erstatter ikke samtykke, vejledning eller minimering. Tjekket fanger åbenlyse helbreds- og lægelige udtryk (fx skade, sygdom, medicin, diagnose og smerte) og enkelte kliniske vægt-/kostudtryk. Almindelige træningsmål som vægttab, tabe fedt eller komme i form behandles ikke som særlige kategorier af det automatiske tjek. Du bliver stadig bedt om ikke at skrive helbredsoplysninger uden samtykke.",
    healthUse:
      "Sådanne oplysninger bruges kun, hvis det er nødvendigt for at tilpasse træning eller coaching, og kun hvis du har givet et særskilt, udtrykkeligt samtykke i formularen. Samtykket er frivilligt og er ikke knyttet til handelsbetingelser, fortrydelsesret eller markedsføring. Vi bruger dem ikke til markedsføring, profilering eller andre formål. Fødselsår indsamles kun, hvis det er slået til af moms-hensyn.",
    hosting:
      "Henvendelser sendes med Resend som e-mail, så Lukas kan svare. Notifikationer lander i den Gmail-indbakke, der er sat som kontaktmail. Hjemmesiden hostes hos Vercel, som kan behandle tekniske oplysninger (fx IP-adresse og serverlogs), der er nødvendige for at vise siden. Hvis en database er tilkoblet, kan forespørgsler, bookinger, kontaktbeskeder og ordreoplysninger også gemmes i PostgreSQL hos Neon. Uden database sendes henvendelser kun som e-mail.",
    payment:
      "Betaling kan ske via Stripe. Stripe behandler dine betalingsoplysninger. Siden gemmer ikke fulde kortoplysninger. Relevante ordre- og betalingsoplysninger kan gemmes til bogføring, dokumentation og for at levere ydelsen.",
    membership:
      "Hvis du kan være berettiget til VFG-medlemspris, tjekker vi, om du har et aktivt medlemskab i Viborg Fitness Gym. Tjekket sker server-til-server. Vi bruger først din email og kan bruge dit telefonnummer som reserve. Vi sender en forespørgsel til Viborg Fitness Gym og får kun svaret, om du er berettiget eller ej. Vi modtager ikke hele medlemsprofilen. Formålet er kun at fastsætte den rigtige pris. Hvis tjekket ikke kan gennemføres, bruges standardprisen.",
    purpose:
      "Oplysningerne bruges til at besvare din henvendelse, følge op på booking og levere personlig træning eller online coaching. Hvis en database er tilkoblet, bruges den til at holde styr på forespørgsler, ordrer og — ved et aktivt klippekort — saldo og booking-link knyttet til din mail. Vi bruger ikke oplysningerne til nyhedsbreve, medmindre du selv beder om det.",
    purposePayment:
      "Oplysningerne bruges også til at gennemføre køb, sende bekræftelse, dokumentere betaling og fastsætte den rigtige pris, hvis VFG-medlemspris kan være relevant.",
    legalBasis:
      "Almindelige personoplysninger behandles for at opfylde eller forberede en aftale med dig (GDPR art. 6, stk. 1, litra b) og til bogføring, hvor loven kræver det (art. 6, stk. 1, litra c). Helbredsoplysninger, som du selv skriver, behandles kun for at tilpasse træning eller coaching — ikke til andre formål. Det særlige grundlag er dit udtrykkelige samtykke (GDPR art. 9, stk. 2, litra a). Samtykket er frivilligt, vises som et særskilt afkrydsningsfelt og er ikke knyttet til handelsbetingelser, fortrydelsesret eller markedsføring.",
    processors:
      "Hjemmesiden hostes hos Vercel. E-mail sendes med Resend og lander i Gmail, så henvendelsen kan besvares. Database (hvis tilkoblet) er PostgreSQL hos Neon. Betaling behandles af Stripe. Hvis medlemspris kan være relevant, sendes din email — og ved behov dit telefonnummer — til Viborg Fitness Gym, så det kan tjekkes, om du er berettiget. Vercel, Resend, Google og Stripe er udbydere uden for eller med behandling uden for EU/EØS. De tilbyder databehandleraftaler.",
    processorItems: [
      "Vercel hoster hjemmesiden og kan behandle tekniske oplysninger som IP-adresse og serverlogs, der er nødvendige for at vise siden.",
      "Resend sender e-mails fra siden (booking- og kontaktbeskeder). Det kan være navn, email, telefon og din besked eller booking. Notifikationer lander i den Gmail-indbakke, der er sat som kontaktmail, så Lukas kan svare. Google kan derfor behandle den samme korrespondance.",
      "Hvis en database er tilkoblet, gemmes forespørgsler, bookinger, kontaktbeskeder, ordrer og klippekort i PostgreSQL hos Neon. Uden database sendes henvendelser kun som e-mail.",
      "Stripe behandler betalingen. Stripe kan behandle navn, email, beløb og betalingsoplysninger. Siden gemmer ikke fulde kortoplysninger — kun de ordre- og betalingsreferencer, der er nødvendige for at levere ydelsen og til bogføring.",
      "Hvis VFG-medlemspris kan være relevant, sender vi en server-til-server-forespørgsel til Viborg Fitness Gym. Vi bruger først din email og kan bruge dit telefonnummer som reserve. Vi får kun svaret, om du er berettiget eller ej — ikke hele medlemsprofilen.",
      "Vercel, Resend, Google og Stripe kan behandle data uden for eller med behandling uden for EU/EØS. De tilbyder databehandleraftaler.",
    ],
    noSale:
      "Vi sælger ikke dine data. Vi deler dem kun, hvis det er nødvendigt for at levere træningen, fastsætte prisen eller vi er forpligtet ved lov.",
    retention:
      "Oplysninger opbevares kun, så længe det er nødvendigt for at svare, levere ydelsen eller overholde loven. Der er ikke sat automatisk sletning på siden i dag; sletning sker efter anmodning eller i almindelig oprydning.",
    retentionItems: [
      "Kontaktbeskeder (navn, email, telefon og din besked) sendes som e-mail. Hvis databasen er tilkoblet, kan beskeden også gemmes der. De opbevares, så længe det er nødvendigt for at svare dig og følge op, og slettes, når der ikke længere er et praktisk behov, eller hvis du beder om det.",
      "Bookingoplysninger (navn, email, telefon, mål, bemærkninger, ønsket tid og status) opbevares, så længe det er nødvendigt for at aftale, gennemføre og administrere træningen, og indtil det ikke længere er nødvendigt efter seneste session.",
      `Klippekort (navn, email, telefon, saldo og booking-link) opbevares, mens kortet er aktivt. Kortet gælder ${clipMonths} måneder fra køb. Efter udløb eller opbrug opbevares oplysningerne kun, så længe det er nødvendigt for at dokumentere saldo og bookinger.`,
      "Helbredsoplysninger, som du selv har skrevet, opbevares ikke længere end nødvendigt for at tilpasse træning eller coaching. Der er ikke sat en automatisk slettefrist for helbredsoplysninger på siden.",
      "Ordre- og betalingsoplysninger, der er nødvendige til bogføring (fx navn, beløb, ydelse, betalingsstatus og betalingsreferencer), kan opbevares i 5 år efter udløbet af det regnskabsår, de vedrører, jf. bogføringsloven. Siden gemmer ikke fulde kortoplysninger.",
      "Tekniske oplysninger hos Vercel (fx IP-adresse og serverlogs) opbevares kun, så længe det er nødvendigt for drift og sikkerhed hos hostingudbyderen. E-mails i indbakken opbevares, så længe det er nødvendigt for korrespondancen.",
      `Når der ikke længere er et praktisk eller retligt behov, slettes oplysningerne efter anmodning eller i almindelig oprydning. Skriv til ${company.email} for indsigt eller sletning.`,
    ],
    cookies:
      "Siden bruger ikke analyse-, reklame- eller tracking-cookies. Der er ingen Instagram-embeds. Interne knaphændelser (fx at en booking er startet) sker som first-party CustomEvent i din browser og sendes ikke til annonce- eller analyseselskaber. Hostingudbyderen kan sætte teknisk nødvendige cookies. Admin-login bruger en httpOnly-cookie, som kun sættes, hvis nogen er logget ind som admin. Stripe kan sætte cookies på deres betalingsside.",
    rights: `Du kan bede om indsigt, berigtigelse, sletning, begrænsning, dataportabilitet og gøre indsigelse. Skriv til ${company.email}. Du kan også klage til Datatilsynet`,
    healthWithdrawal: `Du kan trække dit udtrykkelige samtykke til behandling af helbredsoplysninger tilbage ved at skrive til ${company.email}. Når samtykket er trukket tilbage, stopper den fremtidige behandling, der alene sker på grundlag af samtykket. Tilbagetrækning ændrer ikke lovligheden af den behandling, der fandt sted, før samtykket blev trukket tilbage. Helbredsoplysningerne slettes eller anonymiseres, når der ikke længere er et andet lovligt behov for at opbevare dem. Der er ikke en automatisk slettefunktion på siden; skriv til os, så vi kan behandle anmodningen.`,
  };
}

export type TermsCopy = ReturnType<typeof getTermsCopy>;
export type PrivacyCopy = ReturnType<typeof getPrivacyCopy>;
