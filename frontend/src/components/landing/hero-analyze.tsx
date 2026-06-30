"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

import { GlowButton } from "@/components/primitives/glow-button";
import { Input } from "@/components/ui/input";
import { startAnalysis } from "@/lib/data";

export function HeroAnalyze() {
  const router = useRouter();
  const [url, setUrl] = useState("https://nimbuslabs.example");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = url.trim() || "https://nimbuslabs.example";
    setError(null);
    setSubmitting(true);
    try {
      const { analysis_id } = await startAnalysis(trimmed);
      router.push(`/scan?url=${encodeURIComponent(trimmed)}&id=${encodeURIComponent(analysis_id)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start analysis";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      onSubmit={onAnalyze}
      className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
    >
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://yourcompany.com"
        className="h-12 flex-1 rounded-xl border-white/15 bg-black/40 font-mono text-sm backdrop-blur-md"
        aria-label="Website URL"
      />
      <GlowButton type="submit" className="h-12 shrink-0 px-8" disabled={submitting}>
        {submitting ? "Starting…" : "Analyze Website"}
      </GlowButton>
      {error ? (
        <p className="mt-2 w-full font-mono text-[11px] text-red-400 sm:absolute sm:translate-y-14">
          {error}
        </p>
      ) : null}
    </motion.form>
  );
}
// chore: note 2026-06-30T21:17:34
