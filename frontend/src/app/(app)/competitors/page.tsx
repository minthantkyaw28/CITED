"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import type { CompetitorsPayload } from "@/lib/api/types";
import { GlassPanel } from "@/components/primitives/glass-panel";
import { PageHeader } from "@/components/primitives/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCompetitors } from "@/lib/data";
import { cn } from "@/lib/utils";

const columnHelp = {
  geo: "Share of all MENTIONS edges in this analysis, scaled to a 0-100 proxy.",
  mentions: "Raw count of MENTIONS edges landing on this brand in the current analysis.",
  citation: "Brand mentions divided by the most-mentioned brand in this analysis.",
  semantic: "Not yet derived from the current graph schema.",
  readability: "Not yet derived from the current graph schema.",
} as const;

function formatMaybeNumber(value: number | null, options?: Intl.NumberFormatOptions) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-GB", options).format(value);
}

function HeaderWithTooltip({ label, help }: { label: string; help: string }) {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help text-inherit">{label}</TooltipTrigger>
      <TooltipContent>{help}</TooltipContent>
    </Tooltip>
  );
}

function CompetitorsInner() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("id");
  const [data, setData] = useState<CompetitorsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;

    setError(null);
    getCompetitors(analysisId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load competitors.");
      });

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (!analysisId) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Run an analysis first to compare competitor coverage.</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}>
          Back to analyzer
        </Link>
      </GlassPanel>
    );
  }

  if (error && !data) {
    return <GlassPanel className="p-8 text-sm text-red-200">{error}</GlassPanel>;
  }

  if (!data) {
    return <GlassPanel className="p-8 text-sm text-muted-foreground">Loading competitors…</GlassPanel>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Competitor intelligence"
        description="Side-by-side graph signals that correlate with who models mention and cite."
      />
      <TooltipProvider>
        <GlassPanel className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="font-mono text-[10px] uppercase">Brand</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase">
                  <HeaderWithTooltip label="GEO" help={columnHelp.geo} />
                </TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase">
                  <HeaderWithTooltip label="AI mentions" help={columnHelp.mentions} />
                </TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase">
                  <HeaderWithTooltip label="Citation freq." help={columnHelp.citation} />
                </TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase">
                  <HeaderWithTooltip label="Semantic clarity" help={columnHelp.semantic} />
                </TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase">
                  <HeaderWithTooltip label="AI readability" help={columnHelp.readability} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow
                  key={row.name}
                  className={cn("border-white/10", row.isYou && "bg-primary/5")}
                >
                  <TableCell className="font-medium">
                    {row.name}
                    {row.isYou ? (
                      <span className="ml-2 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] text-primary">
                        you
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMaybeNumber(row.geoScore, { maximumFractionDigits: 1 })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.aiMentions.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMaybeNumber(row.citationFrequency, { maximumFractionDigits: 1 })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMaybeNumber(row.semanticClarity, { maximumFractionDigits: 1 })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMaybeNumber(row.aiReadability, { maximumFractionDigits: 1 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassPanel>
      </TooltipProvider>
      <GlassPanel className="p-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Insight
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{data.insight.leader}</span>{" "}
          {data.insight.summary}
        </p>
      </GlassPanel>
    </div>
  );
}

export default function CompetitorsPage() {
  return (
    <Suspense fallback={<GlassPanel className="p-8 text-sm text-muted-foreground">Loading…</GlassPanel>}>
      <CompetitorsInner />
    </Suspense>
  );
}
// chore: note 2026-07-28T11:25:11
