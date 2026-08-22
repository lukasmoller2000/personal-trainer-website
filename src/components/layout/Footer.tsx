import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { GymLogo } from "@/components/layout/GymLogo";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/lib/utils";

const footerLinks = [
  { label: "Forside", href: "/" },
  { label: "Ydelser", href: "/ydelser" },
  { label: "Booking", href: "/booking" },
  { label: "Om", href: "/om" },
  { label: "FAQ", href: "/faq" },
  { label: "Kontakt", href: "/kontakt" },
];

const legal = [
  { label: "Privatlivspolitik", href: "/privatliv" },
  { label: "Handelsbetingelser", href: "/vilkaar" },
];

export function Footer() {
  return (
    <footer className="bg-ink text-cream">
      <div className="container-custom pt-16 pb-8 md:pt-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Logo inverted />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/55">
              Personlig træning med {siteConfig.trainer} i {siteConfig.venue}.{" "}
              {siteConfig.experience}.{" "}
              <a
                href={siteConfig.gymUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sage hover:underline"
              >
                {siteConfig.venue}
              </a>
            </p>
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
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cream/40">
              Kontakt
            </h2>
            <ul className="mt-4 space-y-3 text-cream/70">
              <li>
                <a
                  href={`mailto:${siteConfig.links.email}`}
                  className="flex items-center gap-2.5 hover:text-cream"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {siteConfig.links.email}
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
                  {siteConfig.address}
                  <br />
                  {siteConfig.hours}
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cream/40">
              Book
            </h2>
            <p className="mt-4 mb-5 text-sm leading-relaxed text-cream/70">
              Book personlig træning eller start online coaching.
            </p>
            <Button href="/booking">Book nu</Button>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-sm text-cream/40 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. Alle rettigheder forbeholdes.
          </p>
          <div className="flex gap-5">
            {legal.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-cream">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
