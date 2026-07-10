import type { NeoEdge, NeoNode, Severity } from "@/lib/mock/types";

export type { NeoEdge, NeoNode, Severity };

export interface AnalyzeResponse {
  analysis_id: string;
}

export interface StatusResponse {
  id: string;
  url: string;
  status: string;
  error: string | null;
}

export interface AnalysisEvent {
  stage: string;
  msg?: string;
  error?: string;
  [key: string]: unknown;
}

export interface DashboardKpiCard {
  id: string;
  title: string;
  value: number | null;
  delta: string | null;
  hint: string;
  accent: "cyan" | "purple" | "blue" | "magenta";
}

export interface VisibilityTrendPoint {
  week: string;
  cited: number;
  modeled: number;
}

export interface CitationByModel {
  model: string;
  count: number;
}

export interface CompetitorBar {
  name: string;
  geo: number | null;
  citations: number | null;
}

export interface QuickInsight {
  title: string;
  detail: string;
}

export interface DashboardPayload {
  kpiCards: DashboardKpiCard[];
  visibilityTrend: VisibilityTrendPoint[];
  citationsByModel: CitationByModel[];
  competitorBars: CompetitorBar[];
  quickInsights: QuickInsight[];
  provenance: Record<string, string>;
}

export interface CompetitorRow {
  name: string;
  isYou?: boolean;
  geoScore: number | null;
  aiMentions: number;
  citationFrequency: number | null;
  semanticClarity: number | null;
  aiReadability: number | null;
}

export interface CompetitorInsight {
  leader: string;
  summary: string;
}

export interface CompetitorsPayload {
  rows: CompetitorRow[];
  insight: CompetitorInsight;
  provenance: Record<string, unknown>;
}

export interface RecommendationProvenance {
  cypher: string;
  params?: Record<string, unknown>;
  result: unknown[];
}

export interface RecommendationItem {
  id: string;
  severity: Severity;
  problem: string;
  whyModelsStruggle: string;
  recommendedFix: string;
  provenance?: RecommendationProvenance;
}

export interface LandingPageRewrite {
  h1_before: string;
  h1_after: string;
  meta_before: string;
  meta_after: string;
  rationale: string;
  target_topics: string[];
  provenance?: RecommendationProvenance;
}

export interface RecommendationPayload {
  landing_page_rewrite: LandingPageRewrite;
  content_gaps: Array<Record<string, unknown>>;
  outreach_targets: Array<Record<string, unknown>>;
  subject: Record<string, unknown>;
  cards: RecommendationItem[];
}

export interface GraphPayload {
  analysis_id: string;
  nodes: NeoNode[];
  edges: NeoEdge[];
}
// chore: note 2026-07-10T12:07:20
