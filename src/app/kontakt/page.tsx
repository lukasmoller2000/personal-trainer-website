import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/sections/ContactForm";
import { PageHero } from "@/components/ui/PageHero";
import { Button } from "@/components/ui/Button";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { GymLogo } from "@/components/layout/GymLogo";
import { siteConfig } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/kontakt", {
  title: "Kontakt",
  description:
    "Kontakt Lukas Møller — book personlig træning, send en forespørgsel om Online Coaching, eller stil et spørgsmål.",
});

const info = [
  {
    icon: Mail,
    label: "Email",
    value: siteConfig.links.email,
    href: `mailto:${siteConfig.links.email}`,
  },
  {
    icon: Phone,
    label: "Telefon",
    value: siteConfig.links.phone,
    href: `tel:${siteConfig.links.phone.replace(/\s/g, "")}`,
  },
  {
    icon: MapPin,
    label: "Adresse",
    value: `${siteConfig.venue}, ${siteConfig.address}`,
    href: siteConfig.gymUrl,
  },
  {
    icon: Clock,
    label: "Åbningstider i gymmet",
    value: siteConfig.hours,
    href: undefined,
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Kontakt"
        title="Har du spørgsmål? Kontakt mig."
        description="Book personlig træning med dato og tid, eller send en forespørgsel om Online Coaching. Har du spørgsmål først, så skriv her."
      />

      <section className="pt-12">
        <div className="container-custom flex flex-col items-start justify-between gap-6 border-b border-sand pb-10 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <GymLogo size={72} />
            <p className="max-w-xl text-ink/65">
              <a
                href={siteConfig.gymUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-ink underline decoration-sage/50 underline-offset-4 hover:text-sage"
              >
                {siteConfig.venue}
              </a>
              , {siteConfig.address}. {siteConfig.hours}.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <SocialLinks />
            <Button href="/booking">Book nu</Button>
          </div>
        </div>
      </section>

      <section className="pt-10">
        <div className="container-custom grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {info.map((item) => (
            <div key={item.label} className="border-t border-sand pt-5">
              <item.icon className="mb-3 h-4 w-4 text-sage" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/40">
                {item.label}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                  className="mt-2 block font-medium text-ink hover:text-sage"
                >
                  {item.value}
                </a>
              ) : (
                <p className="mt-2 font-medium text-ink">{item.value}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <ContactForm showHeading={false} />
    </>
  );
}
