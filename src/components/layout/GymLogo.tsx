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
      className={cn("inline-flex shrink-0", className)}
      aria-label={`${siteConfig.venue} — åbn hjemmeside`}
    >
      <Image
        src="/images/viborg-fitness-gym.jpg"
        alt={siteConfig.venue}
        width={size}
        height={size}
        className="rounded-full"
      />
    </a>
  );
}
