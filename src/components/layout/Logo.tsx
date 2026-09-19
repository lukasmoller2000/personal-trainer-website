import Image from "next/image";
import Link from "next/link";
import { cn, siteConfig } from "@/lib/utils";

/** Official lockup: LM monogram + wordmark. Intrinsic 891×179 (transparent PNG). */
const LOGO_WIDTH = 891;
const LOGO_HEIGHT = 179;

const imageSizes = {
  nav: "h-9 w-auto max-w-[148px] object-contain object-left sm:h-10 sm:max-w-[180px]",
  footer: "h-11 w-auto max-w-[200px] object-contain object-left sm:h-12 sm:max-w-[228px]",
};

export function Logo({
  size = "nav",
  className,
}: {
  inverted?: boolean;
  size?: keyof typeof imageSizes;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} — Personlig træner`}
      className={cn(
        "group inline-flex min-h-11 shrink-0 items-center transition-opacity duration-200 hover:opacity-90",
        className,
      )}
    >
      <span className="nav-logo-lockup">
        <Image
          src="/images/lukas-moller-logo.png"
          alt={`${siteConfig.name} — Personlig træner`}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          sizes={size === "footer" ? "228px" : "180px"}
          priority={size === "nav"}
          quality={90}
          className={cn(imageSizes[size], "bg-transparent")}
        />
      </span>
    </Link>
  );
}
