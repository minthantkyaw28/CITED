import {
  getCompetitors as getLiveCompetitors,
  getDashboard as getLiveDashboard,
  getGraph as getLiveGraph,
  getRecommendations as getLiveRecommendations,
  getStatus as getLiveStatus,
  startAnalysis as startLiveAnalysis,
} from "@/lib/api/client";
import { subscribeToAnalysis as subscribeLiveAnalysis } from "@/lib/api/stream";
import type {
  AnalysisEvent,
  AnalyzeResponse,
  CompetitorsPayload,
  DashboardPayload,
  GraphPayload,
  RecommendationPayload,
  StatusResponse,
} from "@/lib/api/types";
import { competitorInsight, competitorRows } from "@/lib/mock/competitors";
import {
  citationsByModel,
  competitorBars,
  kpiCards,
  quickInsights,
  visibilityTrend,
} from "@/lib/mock/dashboard";
import { graphEdges, graphNodes } from "@/lib/mock/graph";
import { recommendations } from "@/lib/mock/recommendations";
import { optimizedCopy, originalCopy } from "@/lib/mock/rewrite";
import { scanPhases } from "@/lib/mock/scan";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";

function buildMockDashboard(): DashboardPayload {
  return {
    kpiCards,
    visibilityTrend,
    citationsByModel,
    competitorBars,
    quickInsights,
    provenance: {},
  };
}

function buildMockCompetitors(): CompetitorsPayload {
  return {
    rows: competitorRows,
    insight: competitorInsight,
    provenance: {},
  };
}

function buildMockGraph(id: string): GraphPayload {
  return {
    analysis_id: id,
    nodes: graphNodes,
    edges: graphEdges,
  };
}

function buildMockRecommendations(): RecommendationPayload {
  return {
    landing_page_rewrite: {
      h1_before: "Nimbus Labs helps modern teams stay visible as search shifts from links to answers.",
      h1_after: "Nimbus Labs is a generative engine optimization platform for B2B SaaS teams.",
      meta_before: originalCopy,
      meta_after: optimizedCopy,
      rationale: "Mock rewrite payload sourced from the existing frontend demo copy.",
      target_topics: ["generative engine optimization", "AI citations", "AI visibility"],
    },
    content_gaps: [],
    outreach_targets: [],
    subject: { name: "Nimbus Labs" },
    cards: recommendations,
  };
}

function subscribeMockAnalysis(onEvent: (event: AnalysisEvent) => void): () => void {
  const timers = scanPhases.map((phase, index) =>
    window.setTimeout(() => {
      onEvent({
        stage: index === scanPhases.length - 1 ? "done" : "querying",
        msg: phase.line,
      });
    }, phase.atMs)
  );

  return () => {
    for (const timer of timers) window.clearTimeout(timer);
  };
}

export async function startAnalysis(url: string): Promise<AnalyzeResponse> {
  if (USE_MOCKS) {
    return { analysis_id: `mock-${Date.now().toString(36)}` };
  }
  return startLiveAnalysis(url);
}

export async function getStatus(id: string): Promise<StatusResponse> {
  if (USE_MOCKS) {
    return { id, url: "https://nimbuslabs.example", status: "done", error: null };
  }
  return getLiveStatus(id);
}

export async function getGraph(id: string): Promise<GraphPayload> {
  if (USE_MOCKS) return buildMockGraph(id);
  return getLiveGraph(id);
}

export async function getDashboard(id: string): Promise<DashboardPayload> {
  if (USE_MOCKS) return buildMockDashboard();
  return getLiveDashboard(id);
}

export async function getCompetitors(id: string): Promise<CompetitorsPayload> {
  if (USE_MOCKS) return buildMockCompetitors();
  return getLiveCompetitors(id);
}

export async function getRecommendations(id: string): Promise<RecommendationPayload> {
  if (USE_MOCKS) return buildMockRecommendations();
  return getLiveRecommendations(id);
}

export function subscribeToAnalysis(
  analysisId: string,
  onEvent: (event: AnalysisEvent) => void
): () => void {
  if (USE_MOCKS) return subscribeMockAnalysis(onEvent);
  return subscribeLiveAnalysis(analysisId, onEvent);
}
