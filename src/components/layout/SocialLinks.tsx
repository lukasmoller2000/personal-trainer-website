import type { ReactNode } from "react";
import { cn, siteConfig } from "@/lib/utils";

const instagramIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

type SocialItem = {
  label: string;
  href: string;
  icon: ReactNode;
  ariaLabel?: string;
};

const gymSocial: SocialItem[] = [
  {
    label: "Instagram",
    href: siteConfig.links.instagram,
    ariaLabel: "Instagram — Viborg Fitness Gym",
    icon: instagramIcon,
  },
  {
    label: "Facebook",
    href: siteConfig.links.facebook,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4V10c0-.6.4-1 1-1Z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: siteConfig.links.tiktok,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M14.5 3c.4 2.6 1.9 4.3 4.5 4.6v3.1c-1.5 0-2.9-.5-4.1-1.3v6.4c0 3.4-2.7 6.2-6.2 6.2S2.5 19.2 2.5 15.7 5.2 9.5 8.7 9.5c.4 0 .8 0 1.1.1v3.2c-.3-.1-.7-.2-1.1-.2-1.8 0-3.2 1.5-3.2 3.2s1.4 3.2 3.2 3.2 3.2-1.5 3.2-3.2V3h2.6Z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: siteConfig.links.youtube,
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M23 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C19.2 5.4 12 5.4 12 5.4s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6ZM9.8 15.6V8.8l6.2 3.4-6.2 3.4Z" />
      </svg>
    ),
  },
];

export function SocialLinks({
  inverted = false,
  compact = false,
  personalInstagram = false,
}: {
  inverted?: boolean;
  compact?: boolean;
  personalInstagram?: boolean;
}) {
  const social = personalInstagram
    ? gymSocial.map((item) =>
        item.label === "Instagram"
          ? {
              ...item,
              href: siteConfig.links.instagramPersonal,
              ariaLabel: "Instagram — Lukas Møller",
            }
          : item
      )
    : gymSocial;

  return (
    <div className="flex flex-wrap gap-2">
      {social.map((item) => (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.ariaLabel ?? item.label}
          className={cn(
            "flex items-center justify-center rounded-xl transition-colors",
            compact ? "h-9 w-9" : "min-h-11 min-w-11",
            inverted
              ? "rounded-full bg-white/10 text-cream hover:bg-sage hover:text-ink"
              : "rounded-full bg-sand text-ink hover:bg-ink hover:text-cream"
          )}
        >
          {item.icon}
        </a>
      ))}
    </div>
  );
}
