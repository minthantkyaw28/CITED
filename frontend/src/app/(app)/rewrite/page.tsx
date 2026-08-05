"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Copy, Download } from "lucide-react";

import { PageHeader } from "@/components/primitives/page-header";
import { GlassPanel } from "@/components/primitives/glass-panel";
import { Button } from "@/components/ui/button";
import { getRecommendations } from "@/lib/data";
import type { LandingPageRewrite } from "@/lib/api/types";

function formatBefore(rewrite: LandingPageRewrite): string {
  const parts: string[] = [];
  if (rewrite.h1_before?.trim()) parts.push(`H1\n${rewrite.h1_before}`);
  if (rewrite.meta_before?.trim()) parts.push(`META\n${rewrite.meta_before}`);
  return parts.join("\n\n") || "(no original page copy captured)";
}

function formatAfter(rewrite: LandingPageRewrite): string {
  const parts: string[] = [];
  if (rewrite.h1_after?.trim()) parts.push(`H1\n${rewrite.h1_after}`);
  if (rewrite.meta_after?.trim()) parts.push(`META\n${rewrite.meta_after}`);
  if (rewrite.rationale?.trim()) parts.push(`RATIONALE\n${rewrite.rationale}`);
  if (rewrite.target_topics?.length) {
    parts.push(`TARGET TOPICS\n${rewrite.target_topics.map((t) => `• ${t}`).join("\n")}`);
  }
  return parts.join("\n\n") || "(no rewrite generated)";
}

function RewriteInner() {
  const searchParams = useSearchParams();
  const analysisId = searchParams.get("id");
  const [rewrite, setRewrite] = useState<LandingPageRewrite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!analysisId) return;
    setLoading(true);
    setError(null);
    getRecommendations(analysisId)
      .then((payload) => setRewrite(payload.landing_page_rewrite))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [analysisId]);

  const beforeText = useMemo(
    () => (rewrite ? formatBefore(rewrite) : "(waiting for analysis)"),
    [rewrite],
  );
  const afterText = useMemo(
    () => (rewrite ? formatAfter(rewrite) : ""),
    [rewrite],
  );

  useEffect(() => {
    if (!afterText) {
      setTyped("");
      setDone(false);
      return;
    }
    setTyped("");
    setDone(false);
    let i = 0;
    const chunk = 3;
    const id = window.setInterval(() => {
      i += chunk;
      setTyped(afterText.slice(0, i));
      if (i >= afterText.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, 22);
    return () => window.clearInterval(id);
  }, [afterText]);

  async function copy() {
    await navigator.clipboard.writeText(afterText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function exportTxt() {
    const blob = new Blob([afterText], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cited-rewrite-${analysisId ?? "demo"}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!analysisId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rewrite Studio"
          description="Open an analysis from the landing page to view the rewrite for its hero copy."
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rewrite Studio"
        description="Left: your live H1 + meta description as fetched from the page. Right: an LLM-native rewrite tuned for the topics competitors currently dominate in answer-engine responses."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copy}
              disabled={!rewrite}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportTxt}
              disabled={!rewrite}
              className="gap-1.5"
            >
              <Download className="size-3.5" />
              Export
            </Button>
          </div>
        }
      />
      <p className="font-mono text-xs text-muted-foreground">
        analysis_id · <span className="text-foreground">{analysisId}</span>
      </p>
      {loading ? (
        <GlassPanel className="p-6 text-sm text-muted-foreground">Generating rewrite…</GlassPanel>
      ) : null}
      {error ? (
        <GlassPanel className="p-6 text-sm text-red-300">Error: {error}</GlassPanel>
      ) : null}

      <div className="grid min-h-[480px] gap-4 lg:grid-cols-2">
        <GlassPanel className="flex flex-col p-0 overflow-hidden">
          <div className="border-b border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Original · live page extract
          </div>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-muted-foreground">
            {beforeText}
          </pre>
        </GlassPanel>
        <GlassPanel className="flex flex-col p-0 overflow-hidden ring-1 ring-primary/30">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
              AI-optimized · Tessl skill: cypher-for-citation-graphs
            </span>
            {done ? (
              <span className="font-mono text-[10px] text-emerald-400">stream complete</span>
            ) : afterText ? (
              <motion.span
                className="font-mono text-[10px] text-muted-foreground"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              >
                streaming█
              </motion.span>
            ) : null}
          </div>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap bg-black/40 p-4 font-mono text-xs leading-relaxed text-foreground/95">
            {typed}
            {afterText && !done ? <span className="animate-pulse text-primary">▍</span> : null}
          </pre>
        </GlassPanel>
      </div>

      {rewrite?.provenance ? (
        <details className="rounded-lg border border-white/10 bg-black/30 p-4 text-xs">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-primary">
            View graph evidence
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Cypher
              </p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground/80">
                {rewrite.provenance.cypher}
              </pre>
            </div>
            {rewrite.provenance.result?.length ? (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Rows
                </p>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground/80">
                  {JSON.stringify(rewrite.provenance.result, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export default function RewritePage() {
  return (
    <Suspense
      fallback={<div className="p-8 font-mono text-sm text-muted-foreground">Loading…</div>}
    >
      <RewriteInner />
    </Suspense>
  );
}
