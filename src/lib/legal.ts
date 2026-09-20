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
    liability:
      "Træning sker på eget ansvar. Jeg kan aflyse ved sygdom eller force majeure og tilbyder i så fald en ny tid eller at lægge klippet tilbage.",
  };
}

export function getPrivacyCopy() {
  const company = getCompanyConfig();

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
      "Når du skriver via kontaktformularen, indsamler vi navn, email, telefonnummer og din besked. Når du sender en bookingforespørgsel, indsamler vi navn, email, telefonnummer, dit mål og eventuelle bemærkninger. Ved enkelt PT kan du også angive et ønsket dato og tidspunkt. Det er et ønske, ikke en bekræftet reservation.",
    noSensitive:
      "Vi indsamler ikke CPR-nummer og beder ikke om helbredsoplysninger. Skriver du selv noget i fritekst, bruges det kun til at svare dig og tilrettelægge det praktiske. Fødselsår indsamles kun, hvis det senere er slået til af moms-hensyn.",
    hosting:
      "Henvendelser sendes med Resend som e-mail, så Lukas kan svare. Notifikationer lander i den Gmail-indbakke, der er sat som kontaktmail. Hjemmesiden hostes hos Vercel, som kan behandle tekniske oplysninger (fx IP-adresse og serverlogs), der er nødvendige for at vise siden. Hvis en database er tilkoblet, kan forespørgsler, bookinger og ordreoplysninger også gemmes der. Uden database sendes henvendelser kun som e-mail.",
    payment:
      "Betaling kan ske via Stripe. Stripe behandler dine betalingsoplysninger. Siden gemmer ikke fulde kortoplysninger. Relevante ordre- og betalingsoplysninger kan gemmes til bogføring, dokumentation og for at levere ydelsen.",
    membership:
      "Hvis du kan være berettiget til VFG-medlemspris, tjekker vi, om du har et aktivt medlemskab i Viborg Fitness Gym. Vi bruger først din email og kan bruge dit telefonnummer som reserve. Vi sender en forespørgsel til Viborg Fitness Gym og får kun svaret, om du er berettiget eller ej. Vi modtager ikke hele medlemsprofilen. Formålet er kun at fastsætte den rigtige pris. Hvis tjekket ikke kan gennemføres, bruges standardprisen.",
    purpose:
      "Oplysningerne bruges til at besvare din henvendelse, følge op på booking og levere personlig træning. Hvis en database er tilkoblet, bruges den til at holde styr på forespørgsler, ordrer og — ved et aktivt klippekort — saldo og booking-link knyttet til din mail. Vi bruger ikke oplysningerne til nyhedsbreve, medmindre du selv beder om det.",
    purposePayment:
      "Oplysningerne bruges også til at gennemføre køb, sende bekræftelse, dokumentere betaling og fastsætte den rigtige pris, hvis VFG-medlemspris kan være relevant.",
    legalBasis:
      "Behandlingen sker for at opfylde eller forberede en aftale med dig (GDPR art. 6, stk. 1, litra b) og for bogføring, hvor det er påkrævet (art. 6, stk. 1, litra c).",
    processors: `Hjemmesiden hostes hos Vercel. E-mail sendes med Resend og lander i Gmail, så henvendelsen kan besvares. Database (hvis tilkoblet) er PostgreSQL hos den tilkoblede udbyder. Betaling behandles af Stripe. Hvis medlemspris kan være relevant, sendes din email — og ved behov dit telefonnummer — til Viborg Fitness Gym, så det kan tjekkes, om du er berettiget. Vercel, Resend og Google er udbydere uden for eller med behandling uden for EU/EØS. De tilbyder databehandleraftaler.`,
    noSale:
      "Vi sælger ikke dine data. Vi deler dem kun, hvis det er nødvendigt for at levere træningen, fastsætte prisen eller vi er forpligtet ved lov.",
    retention: `Oplysninger opbevares, så henvendelsen kan besvares, og så en eventuel træning kan gennemføres. Bogføringsrelevante oplysninger kan opbevares i den periode, loven kræver. Når der ikke længere er et praktisk eller retligt behov, slettes oplysningerne efter anmodning eller i almindelig oprydning. Skriv til ${company.email} for indsigt eller sletning.`,
    cookies:
      "Siden bruger ikke analyse-, reklame- eller tracking-cookies. Der er ingen Instagram-embeds. Interne knaphændelser (fx at en booking er startet) sker som first-party CustomEvent i din browser og sendes ikke til annonce- eller analyseselskaber. Hostingudbyderen kan sætte teknisk nødvendige cookies. Admin-login bruger en httpOnly-cookie, som kun sættes, hvis nogen er logget ind som admin. Stripe kan sætte cookies på deres betalingsside.",
    rights: `Du kan bede om indsigt, berigtigelse, sletning, begrænsning, dataportabilitet og gøre indsigelse. Skriv til ${company.email}. Du kan også klage til Datatilsynet`,
  };
}

export type TermsCopy = ReturnType<typeof getTermsCopy>;
export type PrivacyCopy = ReturnType<typeof getPrivacyCopy>;
