"use client";

import { motion } from "framer-motion";

import { GlassPanel } from "@/components/primitives/glass-panel";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

const data = [
  { w: "W5", v: 52 },
  { w: "W6", v: 55 },
  { w: "W7", v: 58 },
  { w: "W8", v: 61 },
];

export function LandingPreviewChart() {
  return (
    <GlassPanel className="p-4" hoverGlow>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          AI visibility (demo)
        </p>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] text-primary">
          live mock
        </span>
      </div>
      <div className="mt-3 h-28 w-full min-h-0 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="lpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.19 250)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="oklch(0.72 0.19 250)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="w" hide />
            <Tooltip
              contentStyle={{
                background: "oklch(0.14 0.03 285)",
                border: "1px solid oklch(1 0 0 / 12%)",
                borderRadius: 8,
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="oklch(0.72 0.19 250)"
              fill="url(#lpFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <motion.p
        className="mt-2 font-mono text-[10px] text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        Tessl Skills · streaming graph projection
      </motion.p>
    </GlassPanel>
  );
}
// chore: note 2026-08-20T09:45:55
