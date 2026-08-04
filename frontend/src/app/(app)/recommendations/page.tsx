"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { PageHeader } from "@/components/primitives/page-header";
import { GlassPanel } from "@/components/primitives/glass-panel";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRecommendations } from "@/lib/data";
import type { RecommendationItem, RecommendationPayload } from "@/lib/api/types";
import type { Severity } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

const severityStyles: Record<Severity, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-200",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-200",
  medium: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  low: "border-white/15 bg-white/5 text-muted-foreground",
};

function ProvenanceDetails({ item }: { item: RecommendationItem }) {
  const prov = item.provenance;
  if (!prov || (!prov.cypher && !prov.result?.length)) return null;
  return (
    <details className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
      <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-primary">
        View graph evidence
      </summary>
      <div className="mt-3 space-y-3">
        {prov.cypher ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Cypher
            </p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground/80">
              {prov.cypher}
            </pre>
          </div>
        ) : null}
        {prov.result && prov.result.length > 0 ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Rows
            </p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground/80">
              {JSON.stringify(prov.result, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export default function RecommendationsPage() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("id");
  const [payload, setPayload] = useState<RecommendationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!analysisId) return;
    setLoading(true);
    setError(null);
    getRecommendations(analysisId)
      .then(setPayload)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [analysisId]);

  if (!analysisId) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Recommendations"
          description="Open an analysis from the landing page to view its recommendations."
        />
        <GlassPanel className="p-6 text-sm text-muted-foreground">
          No analysis id in the URL. Visit the{" "}
          <Link href="/" className="text-primary underline">
            landing page
          </Link>{" "}
          and run an analysis first.
        </GlassPanel>
      </div>
    );
  }

  const cards = payload?.cards ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recommendations"
        description="Each card is a Cypher query against your citation graph + a Tessl-Skill-shaped fix. Open 'View graph evidence' to see the exact rows."
      />

      {loading ? (
        <GlassPanel className="p-6 text-sm text-muted-foreground">Loading…</GlassPanel>
      ) : null}
      {error ? (
        <GlassPanel className="p-6 text-sm text-red-300">Error: {error}</GlassPanel>
      ) : null}
      {!loading && !error && cards.length === 0 ? (
        <GlassPanel className="p-6 text-sm text-muted-foreground">
          The graph for analysis <code className="font-mono text-xs">{analysisId}</code> has no
          recommendations yet — wait for the pipeline to finish, then refresh.
        </GlassPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <GlassPanel className="flex h-full flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[10px] uppercase",
                    severityStyles[r.severity as Severity] ?? severityStyles.low,
                  )}
                >
                  {r.severity}
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">
                  rec_id · {r.id}
                </span>
              </div>
              <div>
                <h3 className="font-heading text-base font-semibold leading-snug">
                  {r.problem}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{r.whyModelsStruggle}</p>
              </div>
              {r.recommendedFix ? (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    Recommended fix
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{r.recommendedFix}</p>
                </div>
              ) : null}
              <ProvenanceDetails item={r} />
              {r.id.startsWith("rec-rewrite") ? (
                <Link
                  href={`/rewrite?id=${encodeURIComponent(analysisId)}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "mt-auto inline-flex h-10 w-full items-center justify-center rounded-lg sm:w-auto",
                  )}
                >
                  Open Rewrite Studio
                </Link>
              ) : null}
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
// chore: note 2026-08-04T15:38:54
