import * as React from "react";

import { cn } from "@/lib/utils";

export function GlassPanel({
  className,
  children,
  hoverGlow = true,
  ...props
}: React.ComponentProps<"div"> & { hoverGlow?: boolean }) {
  return (
    <div
      className={cn(
        "glass-panel",
        hoverGlow && "glow-border-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
// chore: note 2026-07-20T15:22:25
