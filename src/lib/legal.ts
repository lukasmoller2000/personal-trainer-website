/**
 * Danish legal copy for /vilkaar, driven by commerce config.
 * COMPANY_CVR / COMPANY_ADDRESS stay empty until filled — never show TODO publicly.
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
    sessionPrice: session?.price ?? 300,
    packPrice: pack?.price ?? 1350,
    packPerSession:
      pack?.price != null && pack.sessions ? pack.price / pack.sessions : 270,
    onlinePrice: online?.price ?? 799,
    paymentsEnabled: isPaymentsEnabledByFlag(),
    cancellationHours: hours,
    clipExpiryMonths: clipMonths,
    withdrawalDays,
    inquiryNotAgreement:
      "En bookingforespørgsel er ikke en endelig aftale. Den ønskede tid er et ønske, indtil jeg har bekræftet den. Først når tiden er bekræftet — og betaling er aftalt eller gennemført, hvis betaling er slået til — gælder tiden som en aftalt session.",
    prices:
      `Enkelt personlig træning koster ${session?.price ?? 300} kr. Fem træninger koster ${pack?.price ?? 1350} kr. (${pack?.price != null && pack.sessions ? pack.price / pack.sessions : 270} kr. pr. træning). Online Coaching koster ${online?.price ?? 799} kr. pr. måned. Den pris, du ser, er den pris, der gælder for ydelsen.`,
    payment:
      isPaymentsEnabledByFlag()
        ? "Kortbetaling sker via Stripe, før en bekræftet tid eller et klippekort aktiveres. Vi gemmer ikke dit kortnummer."
        : "Kortbetaling er ikke slået til på siden. Du sender en forespørgsel, og jeg vender tilbage med bekræftelse og betalingsinfo. Når betaling senere aktiveres, vil kortbetaling ske via Stripe, før tiden eller klippekortet gælder. Vi gemmer ikke dit kortnummer.",
    booking:
      "Enkelt PT: du angiver et ønsket tidspunkt i Viborg Fitness Gym. Klippekort til 5 træninger sendes uden tid — tider bookes, når kortet er aktivt. Online Coaching sendes som forespørgsel; opstart aftales.",
    cancellation: `Afbudsreglen på ${hours} timer gælder kun for bekræftede tider. Når en tid er bekræftet, kan du aflyse eller flytte gratis indtil ${hours} timer før start. Skriv til ${company.email} eller ring ${company.phone}. En forespørgsel, der ikke er bekræftet, er ikke omfattet af afbudsreglen.`,
    lateCancel: `Hvis du aflyser en bekræftet PT-session med mindre end ${hours} timers varsel, betragtes sessionen som udgangspunkt som brugt. Ved klippekort trækkes ét klip. Ved en enkelt betalt session refunderes betalingen som udgangspunkt ikke. Det berører ikke dine ufravigelige rettigheder som forbruger.`,
    noShow: `Udeblivelse fra en bekræftet PT-session behandles efter samme udgangspunkt som sent afbud: sessionen betragtes som brugt. Ved klippekort trækkes ét klip. Ved en enkelt betalt session refunderes betalingen som udgangspunkt ikke. Det berører ikke dine ufravigelige rettigheder som forbruger.`,
    clipCard:
      "Ved køb af 5 træninger får du et klippekort med tilsvarende saldo. Hver booket træning trækker ét klip. Du kan se, hvor mange træninger du har tilbage, når du booker.",
    clipExpiry,
    refund,
    withdrawal: `Ved online køb af tjenesteydelser har du som udgangspunkt ${withdrawalDays} dages fortrydelsesret efter forbrugeraftaleloven. Fortrydelsesretten bortfalder ikke automatisk, fordi ydelsen påbegyndes. Hvis du ønsker, at en betalt ydelse skal starte, før fortrydelsesfristen er udløbet, skal det ske efter dit udtrykkelige ønske. Eventuelt samtykke og oplysning herom indhentes i købsflowet, hvis det er påkrævet — det antages ikke automatisk.${
      isPaymentsEnabledByFlag()
        ? " Ved kortbetaling beder vi dig bekræfte anmodningen om tidlig opstart, før du går til betaling. Det er ikke en fraskrivelse af fortrydelsesretten."
        : " Kortbetaling er ikke slået til på siden endnu."
    }`,
    online:
      "Online Coaching sendes i dag som forespørgsel. Forløbet er beskrevet som et løbende månedligt forløb, der opsiges måneden ud. Opsigelse sker ved at skrive eller ringe. Der sælges ikke et abonnement med automatisk fornyelse på siden nu. Hvis et løbende abonnement senere sælges online, skal kunden have en reel mulighed for at opsige online.",
    onlineCancelRequiredIfSubscription: ONLINE_CANCEL_REQUIRED_IF_SUBSCRIPTION,
    sessionDuration: sessionDuration.copy,
    sessionNotAPromise: sessionDuration.notAPromise,
    liability:
      "Træning sker på eget ansvar. Jeg kan aflyse ved sygdom eller force majeure og tilbyder i så fald en ny tid eller at lægge klippet tilbage.",
  };
}

export type TermsCopy = ReturnType<typeof getTermsCopy>;
