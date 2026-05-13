"use client";

import { motion } from "framer-motion";

import { GlassPanel } from "@/components/primitives/glass-panel";
import type { DashboardPayload } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const accentRing: Record<string, string> = {
  cyan: "ring-cyan-400/40 shadow-[0_0_40px_-12px_oklch(0.82_0.12_195/0.5)]",
  purple: "ring-violet-400/40 shadow-[0_0_40px_-12px_oklch(0.7_0.22_290/0.45)]",
  blue: "ring-blue-400/40 shadow-[0_0_40px_-12px_oklch(0.72_0.19_250/0.45)]",
  magenta: "ring-fuchsia-400/40 shadow-[0_0_40px_-12px_oklch(0.72_0.24_330/0.4)]",
};

interface DashboardKpisProps {
  kpiCards: DashboardPayload["kpiCards"];
}

export function DashboardKpis({ kpiCards }: DashboardKpisProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpiCards.map((k, i) => (
        <motion.div
          key={k.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <GlassPanel
            className={cn(
              "p-5 ring-1",
              accentRing[k.accent]
            )}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {k.title}
            </p>
            <p className="mt-3 font-heading text-4xl font-semibold tabular-nums text-foreground">
              {k.value != null ? k.value : "—"}
            </p>
            <p className="mt-1 text-xs text-emerald-400/90">
              {k.delta ? `${k.delta} vs last scan` : "Single-snapshot graph metric"}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{k.hint}</p>
          </GlassPanel>
        </motion.div>
      ))}
    </div>
  );
}
