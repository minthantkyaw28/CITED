"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  GitBranch,
  Radar,
  Shield,
  Zap,
} from "lucide-react";

import { CitedLogo } from "@/components/cited-logo";
import { HeroAnalyze } from "@/components/landing/hero-analyze";
import { MeshBackground } from "@/components/primitives/mesh-background";
import { GlassPanel } from "@/components/primitives/glass-panel";

const LandingPreviewChart = dynamic(
  () =>
    import("@/components/landing/landing-preview-chart").then((m) => ({
      default: m.LandingPreviewChart,
    })),
  {
    ssr: false,
    loading: () => (
      <GlassPanel className="p-4" hoverGlow>
        <div className="h-28 animate-pulse rounded-lg bg-white/[0.04]" aria-hidden />
      </GlassPanel>
    ),
  },
);

const features = [
  {
    title: "Citation intelligence",
    body: "Map how models, queries, and entities connect — Neo4j-style property graphs without running a cluster.",
    icon: GitBranch,
  },
  {
    title: "GEO & AI visibility",
    body: "Score how extractable your pages are for answer engines versus classic crawl SEO.",
    icon: Radar,
  },
  {
    title: "Agentic analysis",
    body: "Simulated Kimchi workers and Tessl Skills orchestrate crawl, entity extraction, and rewrite planning.",
    icon: Zap,
  },
  {
    title: "Competitive lens",
    body: "Benchmark semantic clarity and citation frequency where it matters: inside AI-generated answers.",
    icon: Brain,
  },
];

const steps = [
  {
    title: "Ingest",
    detail: "Point CITED at your public surface. We snapshot structure, entities, and evidence density.",
  },
  {
    title: "Simulate",
    detail: "Run modeled answer probes across buyer-intent queries and surface citation paths.",
  },
  {
    title: "Optimize",
    detail: "Ship structured rewrites and schema that increase AI-native discoverability.",
  },
];

const modelMarks = ["ChatGPT", "Perplexity", "Claude", "Gemini", "Copilot"];

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <MeshBackground />
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <CitedLogo />
        <nav className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-4">
          <Link href="#features" className="rounded-lg px-2 py-1 hover:bg-white/5 hover:text-foreground">
            Features
          </Link>
          <Link href="/dashboard" className="rounded-lg px-2 py-1 hover:bg-white/5 hover:text-foreground">
            Demo
          </Link>
          <Link href="#docs" className="hidden rounded-lg px-2 py-1 hover:bg-white/5 hover:text-foreground sm:inline">
            Docs
          </Link>
          <Link
            href="https://github.com"
            className="hidden rounded-lg px-2 py-1 hover:bg-white/5 hover:text-foreground md:inline"
          >
            GitHub
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <section className="pt-10 text-center sm:pt-16">
          <motion.p
            className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Infrastructure for the answer economy
          </motion.p>
          <motion.h1
            className="mt-4 font-heading text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            See how{" "}
            <span className="text-gradient-cited">AI models</span> talk about your
            brand.
          </motion.h1>
          <motion.p
            className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            Track citations, AI visibility, GEO, and discoverability across AI-powered
            search systems.
          </motion.p>
          <HeroAnalyze />
        </section>

        <section id="features" className="mt-24 scroll-mt-24">
          <h2 className="font-heading text-center text-2xl font-semibold sm:text-3xl">
            Built like intelligence infrastructure
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
            CITED is the control plane for the invisible citation layer — graph-native,
            agentic, and obsessively focused on how models synthesize your story.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <GlassPanel className="h-full p-5">
                  <f.icon className="size-8 text-primary" />
                  <h3 className="mt-4 font-heading text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                </GlassPanel>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <h2 className="font-heading text-center text-2xl font-semibold sm:text-3xl">
            How it works
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <GlassPanel key={s.title} className="p-6" hoverGlow={false}>
                <span className="font-mono text-xs text-primary">0{i + 1}</span>
                <h3 className="mt-2 font-heading text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.detail}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Modeled answer surfaces
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
            {modelMarks.map((m) => (
              <GlassPanel
                key={m}
                hoverGlow={false}
                className="px-4 py-2 font-mono text-xs text-foreground/90"
              >
                {m}
              </GlassPanel>
            ))}
          </div>
        </section>

        <section className="mt-24 grid items-stretch gap-6 lg:grid-cols-2">
          <GlassPanel className="p-6 lg:p-8">
            <div className="flex items-start gap-3">
              <Shield className="size-6 shrink-0 text-cyan-400" />
              <div>
                <h3 className="font-heading text-xl font-semibold">Architecture strip</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Graph projection mirrors Neo4j property graphs for explainability. Kimchi
                  simulates durable agent workers for crawl + synthesis. Tessl Skills
                  package prompts, validators, and rewrite strategies as composable
                  modules — no live integration in this demo build.
                </p>
                <p id="docs" className="mt-4 font-mono text-[10px] text-muted-foreground">
                  Docs + GitHub links are placeholders for hackathon judging (#).
                </p>
              </div>
            </div>
          </GlassPanel>
          <LandingPreviewChart />
        </section>
      </main>
    </div>
  );
}
