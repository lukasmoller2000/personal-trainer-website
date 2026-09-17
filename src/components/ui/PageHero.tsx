import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-ink pt-32 pb-14 text-cream md:pt-40 md:pb-16">
      <div className={cn("container-custom max-w-3xl")}>
        {eyebrow && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-sage">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl font-extrabold italic tracking-tight text-balance sm:text-5xl md:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/65">{description}</p>
        )}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
