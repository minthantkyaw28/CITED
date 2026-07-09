"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import type { GraphPayload } from "@/lib/api/types";
import { CitationGraphView } from "@/components/graph/citation-graph-view";
import { PageHeader } from "@/components/primitives/page-header";
import { GlassPanel } from "@/components/primitives/glass-panel";
import { buttonVariants } from "@/components/ui/button";
import { getGraph } from "@/lib/data";
import { cn } from "@/lib/utils";

function GraphInner() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("id");
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;

    setError(null);
    getGraph(analysisId)
      .then((payload) => {
        if (!cancelled) setGraph(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load graph.");
      });

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (!analysisId) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Run an analysis first to render the citation graph.</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "mt-4 inline-flex")}>
          Back to analyzer
        </Link>
      </GlassPanel>
    );
  }

  if (error && !graph) {
    return <GlassPanel className="p-8 text-sm text-red-200">{error}</GlassPanel>;
  }

  if (!graph) {
    return <GlassPanel className="p-8 text-sm text-muted-foreground">Loading graph…</GlassPanel>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citation graph"
        description="Interactive Neo4j-style projection of the live analysis graph."
      />
      <CitationGraphView graph={graph} />
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense fallback={<GlassPanel className="p-8 text-sm text-muted-foreground">Loading…</GlassPanel>}>
      <GraphInner />
    </Suspense>
  );
}
// chore: note 2026-07-09T12:19:05
