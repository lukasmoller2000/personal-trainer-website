import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { ForWhom } from "@/components/sections/ForWhom";
import { PersonalTraining } from "@/components/sections/PersonalTraining";
import { OnlineCoaching } from "@/components/sections/OnlineCoaching";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Testimonials } from "@/components/sections/Testimonials";
import { AboutTeaser } from "@/components/sections/AboutTeaser";
import { FAQ } from "@/components/sections/FAQ";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/");

export default function HomePage() {
  return (
    <>
      <Hero />
      <ForWhom />
      <PersonalTraining />
      <OnlineCoaching />
      <HowItWorks />
      <AboutTeaser />
      <Testimonials />
      <FAQ limit={6} />
      <CtaBanner />
    </>
  );
}
