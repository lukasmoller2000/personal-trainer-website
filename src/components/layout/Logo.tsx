import Link from "next/link";
import { cn, siteConfig } from "@/lib/utils";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} — Personlig træner`}
      className="group flex min-h-11 items-center gap-2 transition-opacity duration-200 hover:opacity-90 sm:gap-2.5"
    >
      <span
        className={cn(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
          inverted
            ? "border-sage/75 bg-cream text-ink group-hover:border-sage"
            : "border-sage bg-ink text-cream group-hover:border-moss"
        )}
      >
        <span
          className={cn(
            "absolute inset-[3px] rounded-full border transition-colors duration-200",
            inverted
              ? "border-ink/10 group-hover:border-ink/20"
              : "border-white/15 group-hover:border-white/25"
          )}
        />
        <span className="relative font-display text-[13px] font-extrabold leading-none">
          L
        </span>
      </span>

      <span className="flex min-w-0 flex-col justify-center leading-none">
        <span
          className={cn(
            "whitespace-nowrap font-display text-[13px] font-extrabold uppercase tracking-[0.06em] sm:text-sm",
            inverted ? "text-white" : "text-ink"
          )}
        >
          Lukas Møller
        </span>
        <span
          className={cn(
            "mt-[3px] whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 sm:text-[10px] sm:tracking-[0.22em]",
            inverted
              ? "text-sage/80 group-hover:text-sage"
              : "text-ink/45 group-hover:text-ink/60"
          )}
        >
          Personlig træner
        </span>
      </span>
    </Link>
  );
}
