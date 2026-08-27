import Image from "next/image";
import { cn, siteConfig } from "@/lib/utils";

/** Official VFG winged/barbell mark is 300×112. */
const LOGO_ASPECT = 300 / 112;

export function GymLogo({
  size = 80,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const width = Math.round(size * LOGO_ASPECT);

  return (
    <a
      href={siteConfig.gymUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-xl bg-ink",
        className,
      )}
      aria-label={`${siteConfig.venue} — åbn hjemmeside`}
      style={{ width, height: size }}
    >
      <Image
        src="/images/vfg-logo.png"
        alt={siteConfig.venue}
        width={width}
        height={size}
        className="h-full w-full object-contain"
      />
    </a>
  );
}
