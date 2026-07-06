import * as React from "react";

import { cn } from "@/lib/utils";

export function GlowButton({
  className,
  children,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(
        "relative inline-flex h-11 items-center justify-center overflow-hidden rounded-xl px-6 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]",
        "bg-gradient-to-r from-[oklch(0.55_0.22_290)] via-[oklch(0.55_0.2_250)] to-[oklch(0.6_0.14_195)]",
        "shadow-[0_0_40px_-8px_oklch(0.72_0.19_250/0.6)] hover:shadow-[0_0_48px_-6px_oklch(0.72_0.19_250/0.75)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-transparent opacity-60"
      />
    </button>
  );
}
// chore: note 2026-07-06T12:56:33
