import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { GymInstagramLink, SocialLinks } from "@/components/layout/SocialLinks";
import { GymLogo } from "@/components/layout/GymLogo";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/utils";
import { getCompanyConfig } from "@/lib/commerce";

const footerLinks = [
  { label: "Forside", href: "/" },
  { label: "Ydelser", href: "/ydelser" },
  { label: "Booking", href: "/booking" },
  { label: "Om", href: "/om" },
  { label: "FAQ", href: "/faq" },
  { label: "Kontakt", href: "/kontakt" },
];

const legal = [
  { label: "Vilkår", href: "/vilkaar" },
  { label: "Privatliv", href: "/privatliv" },
  { label: "Kontakt", href: "/kontakt" },
];

export function Footer() {
  const company = getCompanyConfig();

  return (
    <footer className="bg-ink text-cream">
      <div className="container-custom pt-16 pb-8 md:pt-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo inverted />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/55">
              {company.name} · {company.tradeName}. Personlig træning i{" "}
              <a
                href={siteConfig.gymUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sage hover:underline"
              >
                {siteConfig.venue}
              </a>
              . Enkelt PT 300 kr., 5 træninger 1.350 kr. Online Coaching 799 kr./md.
            </p>
            {company.cvr ? (
              <p className="mt-2 text-sm text-cream/45">CVR {company.cvr}</p>
            ) : null}
            <div className="mt-5">
              <SocialLinks inverted personalInstagram />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cream/40">
              Navigation
            </h2>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-cream/70 transition-colors hover:text-cream">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-cream/40">
              Jura
            </h2>
            <ul className="mt-4 space-y-2.5">
              {legal
                .filter((link) => link.href !== "/kontakt")
                .map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-cream/70 transition-colors hover:text-cream">
                      {link.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cream/40">
              Kontakt
            </h2>
            <ul className="mt-4 space-y-3 text-cream/70">
              <li>
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-2.5 hover:text-cream"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {company.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${siteConfig.links.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2.5 hover:text-cream"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {siteConfig.links.phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <GymLogo size={48} />
                <span>
                  <a
                    href={siteConfig.gymUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-sage"
                  >
                    {siteConfig.venue}
                  </a>
                  <br />
                  <span className="text-cream/45">Træningssted</span>
                  <br />
                  {siteConfig.address}
                  <br />
                  {siteConfig.hours}
                  <br />
                  <GymInstagramLink className="text-cream/55 hover:text-sage" />
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cream/40">
              Book
            </h2>
            <p className="mt-4 mb-5 text-sm leading-relaxed text-cream/70">
              Book 1:1 i Viborg, eller start online coaching.
            </p>
            <Button href="/booking?produkt=session" trackEvent="pt_cta_clicked">
              Book personlig træning
            </Button>
            <p className="mt-4 text-sm text-cream/55">
              <Link href="/booking?produkt=online" className="hover:text-cream">
                Online coaching
              </Link>
              {" · "}
              <Link href="/kontakt" className="hover:text-cream">
                Tag en snak
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-sm md:flex-row md:items-center">
          <p className="text-cream/40">
            © {new Date().getFullYear()} {siteConfig.name}. Alle rettigheder forbeholdes.
          </p>
          <nav aria-label="Juridiske links" className="flex flex-wrap gap-x-6 gap-y-2">
            {legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-cream/80 underline-offset-4 hover:text-cream hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
