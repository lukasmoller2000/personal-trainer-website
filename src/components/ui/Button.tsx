"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { track, type TrackEvent } from "@/lib/track";
import { forwardRef, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "light" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  trackEvent?: TrackEvent;
  children?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-sage text-ink hover:bg-moss",
  secondary: "bg-ink text-cream hover:bg-forest",
  outline: "border border-ink/20 text-ink hover:border-ink/40 hover:bg-ink/5",
  ghost: "text-ink/70 hover:text-ink hover:bg-sand",
  light: "border border-white/70 text-white hover:bg-white hover:text-ink",
  accent: "border border-sage text-sage hover:bg-sage hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-5 text-sm",
  md: "min-h-12 px-6 text-base",
  lg: "min-h-14 px-8 text-base md:text-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", href, trackEvent, children, onClick, ...props },
    ref
  ) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      variants[variant],
      sizes[size],
      className
    );

    const handleTrack = () => {
      if (trackEvent) track(trackEvent);
    };

    if (href) {
      const external = href.startsWith("http");
      if (external) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className={classes}
            onClick={handleTrack}
          >
            {children}
          </a>
        );
      }

      return (
        <Link href={href} className={classes} onClick={handleTrack}>
          {children}
        </Link>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={classes}
        whileTap={{ scale: 0.98 }}
        onClick={(event) => {
          handleTrack();
          onClick?.(event);
        }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };
