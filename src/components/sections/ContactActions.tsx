import { Button } from "@/components/ui/Button";
import { phoneTelHref, whatsappHref } from "@/lib/contact-ui";
import { siteConfig } from "@/lib/utils";

export const CONTACT_WHATSAPP_MESSAGE =
  "Hej Lukas, jeg vil gerne høre mere om personlig træning.";

export function ContactActions({ inverted = true }: { inverted?: boolean }) {
  return (
    <div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          href="/booking?produkt=session"
          size="lg"
          trackEvent="pt_cta_clicked"
          className="w-full uppercase tracking-[0.14em] sm:w-auto"
        >
          Book personlig træning
        </Button>
        <Button
          href={whatsappHref(siteConfig.links.phone, CONTACT_WHATSAPP_MESSAGE)}
          variant={inverted ? "accent" : "outline"}
          size="lg"
          className="w-full uppercase tracking-[0.14em] sm:w-auto"
        >
          Skriv på WhatsApp
        </Button>
      </div>
      <p className={inverted ? "mt-4 text-sm text-cream/60" : "mt-4 text-sm text-ink/55"}>
        Eller ring på{" "}
        <a
          href={phoneTelHref(siteConfig.links.phone)}
          className={
            inverted
              ? "font-medium text-sage underline decoration-sage/40 underline-offset-4 hover:text-cream"
              : "font-medium text-ink underline decoration-sage/50 underline-offset-4 hover:text-sage"
          }
        >
          {siteConfig.links.phone}
        </a>
      </p>
    </div>
  );
}
