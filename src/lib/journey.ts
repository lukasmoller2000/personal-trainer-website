export type JourneyStage = {
  label: string;
  src: string;
  alt: string;
};

export const journeyStages: JourneyStage[] = [
  {
    label: "Tidligt",
    src: "/images/journey-early.jpg",
    alt: "Lukas Møller tidligt i træningen, selfie i omklædningsrum",
  },
  {
    label: "Undervejs",
    src: "/images/journey-mid.jpg",
    alt: "Lukas Møller undervejs i træningen, omklædningsrum",
  },
  {
    label: "I dag",
    src: "/images/journey-now.jpg",
    alt: "Lukas Møller i dag",
  },
];
