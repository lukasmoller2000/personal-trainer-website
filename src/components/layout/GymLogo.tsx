import Image from "next/image";
import { cn, siteConfig } from "@/lib/utils";

export function GymLogo({
  size = 80,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <a
      href={siteConfig.gymUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-full bg-ink",
        className,
      )}
      aria-label={`${siteConfig.venue} — åbn hjemmeside`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/vfg-logo.png"
        alt={siteConfig.venue}
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </a>
  );
}
