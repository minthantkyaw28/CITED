"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

import { CitedLogo } from "@/components/cited-logo";
import { AgentLog } from "@/components/primitives/agent-log";
import { GlassPanel } from "@/components/primitives/glass-panel";
import { MeshBackground } from "@/components/primitives/mesh-background";
import { subscribeToAnalysis } from "@/lib/data";
import type { AnalysisEvent } from "@/lib/api/types";

const STAGE_ORDER = [
  "starting",
  "discovering",
  "planning",
  "querying",
  "extracting",
  "extracted",
  "building_graph",
  "done",
] as const;

function stageProgress(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
  if (idx < 0) return 5;
  return Math.min(100, Math.round(((idx + 1) / STAGE_ORDER.length) * 100));
}

function formatEvent(event: AnalysisEvent): string {
  const stage = event.stage || "event";
  const msg = typeof event.msg === "string" ? event.msg : "";
  const extras: string[] = [];
  if (typeof event.model === "string") extras.push(`model=${event.model}`);
  if (typeof event.query_idx === "number" && typeof event.total === "number") {
    extras.push(`${event.query_idx}/${event.total}`);
  }
  if (typeof event.brand === "string") extras.push(`brand=${event.brand}`);
  if (typeof event.error === "string") extras.push(`error: ${event.error}`);
  if (typeof event.n === "number") extras.push(`n=${event.n}`);
  const suffix = extras.length ? ` · ${extras.join(" · ")}` : "";
  const prefix = stage === "failed" ? "[!]" : "[✓]";
  return `${prefix} ${stage}${msg ? `: ${msg}` : ""}${suffix}`;
}

export function ScanClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url") ?? "https://nimbuslabs.example";
  const analysisId = searchParams.get("id");

  const hostname = useMemo(() => {
    try {
      return new URL(urlParam).hostname;
    } catch {
      return urlParam.replace(/^https?:\/\//, "").split("/")[0] || "target";
    }
  }, [urlParam]);

  const [lines, setLines] = useState<string[]>([
    "[·] Connecting to Kimchi orchestrator…",
  ]);
  const [progress, setProgress] = useState(2);
  const [finalStage, setFinalStage] = useState<"done" | "failed" | null>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!analysisId) {
      setLines((prev) => [
        ...prev,
        "[!] No analysis id in URL — return to the landing page and try again.",
      ]);
      return;
    }

    const unsubscribe = subscribeToAnalysis(analysisId, (event) => {
      setLines((prev) => [...prev, formatEvent(event)]);
      setProgress(stageProgress(event.stage));
      if (event.stage === "done" || event.stage === "failed") {
        setFinalStage(event.stage);
      }
    });

    return unsubscribe;
  }, [analysisId]);

  useEffect(() => {
    if (finalStage !== "done" || redirectedRef.current || !analysisId) return;
    redirectedRef.current = true;
    const t = window.setTimeout(() => {
      router.replace(`/dashboard?id=${encodeURIComponent(analysisId)}`);
    }, 900);
    return () => window.clearTimeout(t);
  }, [finalStage, analysisId, router]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <MeshBackground />
      <header className="relative z-10 border-b border-white/10 bg-background/60 px-4 py-4 backdrop-blur-xl sm:px-6">
        <CitedLogo />
      </header>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <GlassPanel className="w-full max-w-2xl p-6 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Autonomous scan · live
            </p>
            <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
              Analyzing <span className="text-gradient-cited">{hostname}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Kimchi gateway · Tessl Skill: cypher-for-citation-graphs · Neo4j property graph
            </p>
            {analysisId ? (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                analysis_id · {analysisId}
              </p>
            ) : null}
          </motion.div>

          <div className="mt-6">
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Pipeline</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[oklch(0.55_0.22_290)] via-[oklch(0.55_0.2_250)] to-[oklch(0.6_0.14_195)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "tween", ease: "linear", duration: 0.2 }}
              />
            </div>
          </div>

          <div className="mt-6">
            <AgentLog lines={lines} />
          </div>

          <p className="mt-4 font-mono text-[10px] text-muted-foreground">
            {finalStage === "done"
              ? "Done — redirecting to dashboard…"
              : finalStage === "failed"
              ? "Pipeline failed — check the log above."
              : "Streaming live events from the backend (Server-Sent Events)."}
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
