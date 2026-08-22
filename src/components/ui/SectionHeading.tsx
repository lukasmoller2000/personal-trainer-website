import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  light?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  light = false,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-12 md:mb-16",
        align === "center" && "mx-auto max-w-2xl text-center",
        className
      )}
    >
      {eyebrow && (
        <span className={cn(
          "mb-4 inline-block text-xs font-semibold uppercase tracking-[0.22em]",
          light ? "text-sage" : "text-ink/45"
        )}>
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          "font-display text-3xl font-extrabold italic tracking-tight text-balance sm:text-4xl md:text-5xl",
          light ? "text-white" : "text-ink"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-5 text-base leading-relaxed md:text-lg",
            light ? "text-white/70" : "text-ink/65"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
