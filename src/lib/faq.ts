import { sessionDuration } from "@/lib/commerce";

export const faqs = [
  {
    question: "Kan jeg booke bare én træning?",
    answer:
      "Ja. Du kan booke en enkelt personlig træning til 300 kr. uden at binde dig til et forløb. Du kan også købe 5 træninger til 1.350 kr. (270 kr. pr. træning — 150 kr. under 5 enkeltbookinger).",
  },
  {
    question: "Hvad får jeg i Online Coaching?",
    answer:
      "Du får et personligt træningsprogram, kostplan, ugentlige check-ins, feedback og opfølgning, løbende justeringer og tilpasning efter dine resultater og hverdag. Forløbet kører måned for måned og opsiges måneden ud. 799 kr./md.",
  },
  {
    question: "Hvordan virker 5 træninger?",
    answer:
      "Du sender en forespørgsel på 5 træninger til 1.350 kr. (270 kr. pr. træning — spar 150 kr.). Du vælger ikke tid ved henvendelsen. Når klippekortet er aktivt, booker du tider med dine klip og kan se, hvor mange træninger du har tilbage.",
  },
  {
    question: "Hvor lang er en session?",
    answer: `${sessionDuration.copy} ${sessionDuration.notAPromise}`,
  },
  {
    question: "Passer det til begyndere?",
    answer:
      "Ja. Planen tilpasses dit niveau. Du behøver ikke være i god form, før du starter — vi tager udgangspunkt i der, hvor du er.",
  },
  {
    question: "Hvordan starter jeg?",
    answer:
      "Personlig træning: send en forespørgsel med dato og tid, eller send en forespørgsel på 5 træninger. Online Coaching: send en forespørgsel via booking — du vælger ikke tid i gymmet, og opstart aftales.",
  },
  {
    question: "Hvordan foregår personlig træning?",
    answer: sessionDuration.copy,
  },
  {
    question: "Hvad er forskellen på PT og Online Coaching?",
    answer:
      "En personlig træning er én session i gymmet til 300 kr. Du kan også købe 5 træninger til 1.350 kr. Online Coaching er et løbende månedligt forløb med program, kostplan og ugentlige check-ins — 799 kr./md.",
  },
  {
    question: "Er der binding?",
    answer:
      "Du kan booke én personlig træning ad gangen uden at binde dig til et forløb. 5 træninger er fem sessioner — ikke et løbende abonnement. Online Coaching kører måned for måned og opsiges måneden ud.",
  },
  {
    question: "Hvor foregår træningen?",
    answer:
      "Personlig træning foregår i Viborg Fitness Gym, Falkevej 16B, 8800 Viborg. Online Coaching foregår der, hvor du træner selv.",
  },
  {
    question: "Hvad skal jeg have med?",
    answer:
      "Træningstøj, indendørssko og en vandflaske. Sig til, hvis du har skader eller begrænsninger.",
  },
  {
    question: "Kan jeg ændre min booking?",
    answer:
      "Enkelt PT: aflys eller flyt senest 24 timer før. Senere afbud eller udeblivelse tæller som brugt træning. Online Coaching opsiges måneden ud.",
  },
  {
    question: "Hvordan betaler jeg?",
    answer:
      "Når online betaling er slået til, betaler du med kort via Stripe, før tiden eller klippekortet gælder. Kortoplysninger gemmes hos Stripe — ikke på siden. Indtil betaling er slået til, sender du en forespørgsel, og jeg vender tilbage med bekræftelse og betalingsinfo (MobilePay, overførsel eller kontant).",
  },
];
