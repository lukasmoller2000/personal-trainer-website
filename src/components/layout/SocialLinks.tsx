import type { ReactNode } from "react";
import { cn, siteConfig, socialInstagramHref } from "@/lib/utils";

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
];

export function GymInstagramLink({ className }: { className?: string }) {
  return (
    <a
      href={siteConfig.links.instagram}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      Instagram · Viborg Fitness Gym
    </a>
  );
}

export function SocialLinks({
  inverted = false,
  compact = false,
  personalInstagram = true,
}: {
  inverted?: boolean;
  compact?: boolean;
  personalInstagram?: boolean;
}) {
  const social = gymSocial.map((item) =>
    item.label === "Instagram"
      ? {
          ...item,
          href: socialInstagramHref(personalInstagram),
          ariaLabel: personalInstagram
            ? "Instagram — Lukas Møller"
            : "Instagram — Viborg Fitness Gym",
        }
      : item
  );

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
