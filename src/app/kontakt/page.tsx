import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { ContactActions } from "@/components/sections/ContactActions";
import { ContactForm } from "@/components/sections/ContactForm";
import { PageHero } from "@/components/ui/PageHero";
import { GymInstagramLink, SocialLinks } from "@/components/layout/SocialLinks";
import { GymLogo } from "@/components/layout/GymLogo";
import { getCompanyConfig } from "@/lib/commerce";
import { phoneTelHref } from "@/lib/contact-ui";
import { siteConfig } from "@/lib/utils";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("/kontakt", {
  title: "Kontakt – personlig træner i Viborg",
  description:
    "Tag en uforpligtende snak med Lukas Møller om personlig træning i Viborg, online coaching, eller hvilket program der passer.",
});

const company = getCompanyConfig();

const info = [
  {
    icon: Mail,
    label: "Email",
    value: company.email,
    href: `mailto:${company.email}`,
  },
  {
    icon: Phone,
    label: "Telefon",
    value: siteConfig.links.phone,
    href: phoneTelHref(siteConfig.links.phone),
  },
  {
    icon: MapPin,
    label: "Træningssted",
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
        title="Tag en uforpligtende snak"
        description="Usikker på om personlig træning i Viborg eller online coaching passer? Book en tid, skriv på WhatsApp, eller ring — så tager vi en snak om dit mål."
      >
        <ContactActions />
      </PageHero>

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
              , træningssted {siteConfig.address}. {siteConfig.hours}.{" "}
              <GymInstagramLink className="underline decoration-sage/50 underline-offset-4 hover:text-sage" />
            </p>
          </div>
          <SocialLinks compact />
        </div>
      </section>

      <section className="pt-10">
        <div className="container-custom grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {info.map((item) => (
            <div key={item.label} className="border-t border-sand pt-5">
              <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-sage text-ink">
                <item.icon className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/60">
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
