import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { Stats } from "@/components/sections/Stats";
import { Values } from "@/components/sections/Values";
import { ForWhom } from "@/components/sections/ForWhom";
import { Offerings } from "@/components/sections/Offerings";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { AboutTeaser } from "@/components/sections/AboutTeaser";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/");

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <Values />
      <ForWhom />
      <Offerings />
      <HowItWorks />
      <AboutTeaser />
      <CtaBanner />
    </>
  );
}
