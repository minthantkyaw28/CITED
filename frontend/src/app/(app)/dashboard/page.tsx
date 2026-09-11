"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import type { DashboardPayload } from "@/lib/api/types";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardKpis } from "@/components/dashboard/dashboard-kpis";
import { GlassPanel } from "@/components/primitives/glass-panel";
import { PageHeader } from "@/components/primitives/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getDashboard } from "@/lib/data";
import { cn } from "@/lib/utils";

function DashboardInner() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("id");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    getDashboard(analysisId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (!analysisId) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Run an analysis first to populate the dashboard.</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}>
          Back to analyzer
        </Link>
      </GlassPanel>
    );
  }

  if (loading && !data) {
    return <GlassPanel className="p-8 text-sm text-muted-foreground">Loading dashboard metrics…</GlassPanel>;
  }

  if (error && !data) {
    return <GlassPanel className="p-8 text-sm text-red-200">{error}</GlassPanel>;
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Command center"
        description="Real graph-derived snapshot of how AI systems cite and summarize your brand in this run."
      />
      <DashboardKpis kpiCards={data.kpiCards} />
      <DashboardCharts
        visibilityTrend={data.visibilityTrend}
        citationsByModel={data.citationsByModel}
        competitorBars={data.competitorBars}
      />
      <GlassPanel className="p-6">
        <h2 className="font-heading text-lg font-semibold">Quick insights</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {data.quickInsights.map((ins) => (
            <li
              key={ins.title}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                {ins.title}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{ins.detail}</p>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<GlassPanel className="p-8 text-sm text-muted-foreground">Loading…</GlassPanel>}>
      <DashboardInner />
    </Suspense>
  );
}
