import Link from "next/link";

import { cn } from "@/lib/utils";

export function CitedLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-2", className)}>
      <span
        className="font-heading text-lg font-semibold tracking-tight text-gradient-cited"
        aria-hidden
      >
        ◇
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight">
        CITED
      </span>
      <span className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
        beta
      </span>
    </Link>
  );
}
// chore: note 2026-07-09T21:05:34
