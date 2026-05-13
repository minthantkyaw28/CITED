"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DashboardPayload } from "@/lib/api/types";
import { GlassPanel } from "@/components/primitives/glass-panel";

const tooltipStyle = {
  background: "oklch(0.14 0.03 285)",
  border: "1px solid oklch(1 0 0 / 12%)",
  borderRadius: 8,
  fontSize: 11,
};

interface DashboardChartsProps {
  visibilityTrend: DashboardPayload["visibilityTrend"];
  citationsByModel: DashboardPayload["citationsByModel"];
  competitorBars: DashboardPayload["competitorBars"];
}

export function DashboardCharts({
  visibilityTrend,
  citationsByModel,
  competitorBars,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassPanel className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            AI visibility trend
          </p>
          <div className="mt-4 h-64 min-h-[16rem] min-w-0">
            {visibilityTrend.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
                <LineChart data={visibilityTrend}>
                  <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                  <XAxis dataKey="week" stroke="oklch(0.55 0.03 260)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="oklch(0.55 0.03 260)" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="cited"
                    name="Attributed citations"
                    stroke="oklch(0.72 0.19 250)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="modeled"
                    name="Modeled visibility"
                    stroke="oklch(0.7 0.22 290)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-sm text-muted-foreground">
                Trend builds over multiple runs.
              </div>
            )}
          </div>
        </GlassPanel>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <GlassPanel className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Citations across models
          </p>
          <div className="mt-4 h-64 min-h-[16rem] min-w-0">
            {citationsByModel.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256}>
                <BarChart data={citationsByModel} layout="vertical">
                  <CartesianGrid stroke="oklch(1 0 0 / 6%)" horizontal={false} />
                  <XAxis type="number" stroke="oklch(0.55 0.03 260)" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="model"
                    width={88}
                    stroke="oklch(0.55 0.03 260)"
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Citations" fill="oklch(0.82 0.12 195)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-sm text-muted-foreground">
                No citation edges have been written for this analysis yet.
              </div>
            )}
          </div>
        </GlassPanel>
      </motion.div>

      <motion.div
        className="lg:col-span-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassPanel className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Competitor comparison · GEO vs citations
          </p>
          <div className="mt-4 h-72 min-h-[18rem] min-w-0">
            {competitorBars.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}>
                <BarChart data={competitorBars}>
                  <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                  <XAxis dataKey="name" stroke="oklch(0.55 0.03 260)" tick={{ fontSize: 10 }} />
                  <YAxis stroke="oklch(0.55 0.03 260)" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="geo" name="GEO score" fill="oklch(0.72 0.19 250)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="citations" name="AI citation %" fill="oklch(0.7 0.22 290)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 text-center text-sm text-muted-foreground">
                Competitor comparison appears after model responses mention multiple brands.
              </div>
            )}
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
