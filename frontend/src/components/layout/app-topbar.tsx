"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CitedLogo } from "@/components/cited-logo";
import { cn } from "@/lib/utils";

const mobileLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/graph", label: "Citation Graph" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/rewrite", label: "Rewrite Studio" },
  { href: "/competitors", label: "Competitors" },
];

function titleFromPath(path: string) {
  if (path.startsWith("/graph")) return "Citation Graph";
  if (path.startsWith("/recommendations")) return "Recommendations";
  if (path.startsWith("/rewrite")) return "Rewrite Studio";
  if (path.startsWith("/competitors")) return "Competitor Intelligence";
  return "Dashboard";
}

export function AppTopbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  function withCurrentParams(href: string) {
    return query ? `${href}?${query}` : href;
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-white/10 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger
            className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-foreground transition-colors hover:bg-white/5 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-white/10 bg-sidebar/95">
            <SheetHeader>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
            </SheetHeader>
            <div className="mt-6 px-2">
              <CitedLogo />
            </div>
            <nav className="mt-8 flex flex-col gap-1 px-2">
              {mobileLinks.map((l) => (
                <Link
                  key={l.href}
                  href={withCurrentParams(l.href)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    pathname.startsWith(l.href) && "bg-primary/15 text-foreground"
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Workspace
          </p>
          <p className="font-heading text-sm font-semibold">
            {titleFromPath(pathname)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] text-emerald-300 sm:inline-flex">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
          agents idle
        </span>
      </div>
    </header>
  );
}
// chore: note 2026-08-28T03:51:07
