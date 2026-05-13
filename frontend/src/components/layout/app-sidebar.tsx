"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  GitBranch,
  LayoutDashboard,
  PencilLine,
  Sparkles,
  Users,
} from "lucide-react";

import { CitedLogo } from "@/components/cited-logo";
import { GlassPanel } from "@/components/primitives/glass-panel";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/graph", label: "Citation Graph", icon: GitBranch },
  { href: "/recommendations", label: "Recommendations", icon: Sparkles },
  { href: "/rewrite", label: "Rewrite Studio", icon: PencilLine },
  { href: "/competitors", label: "Competitors", icon: Users },
  { href: "#", label: "Reports", icon: FileText, disabled: true },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-dvh w-60 shrink-0 flex-col border-r border-white/10 bg-sidebar/80 py-6 backdrop-blur-xl lg:flex">
      <div className="px-4">
        <CitedLogo />
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          AI visibility OS
        </p>
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-1 px-2">
        {nav.map((item) => {
          const active =
            !item.disabled && pathname.startsWith(item.href) && item.href !== "#";
          const Icon = item.icon;
          const inner = (
            <span
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                item.disabled && "cursor-not-allowed opacity-40",
                !item.disabled && !active && "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                active && "bg-primary/15 text-foreground ring-1 ring-primary/40"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </span>
          );
          if (item.disabled || item.href === "#") {
            return (
              <div key={item.label} className="pointer-events-none">
                {inner}
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href}>
              {inner}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-4 pb-6 pt-6">
        <GlassPanel hoverGlow={false} className="p-3 text-xs text-muted-foreground">
          <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/80">
            Stack (simulated)
          </p>
          <ul className="mt-2 space-y-1">
            <li>Neo4j-style graph projection</li>
            <li>Kimchi long-running agents</li>
            <li>Tessl Skills · optimization</li>
          </ul>
        </GlassPanel>
      </div>
    </aside>
  );
}
