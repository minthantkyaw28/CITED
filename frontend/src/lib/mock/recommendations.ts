import type { Severity } from "./types";

export interface RecommendationItem {
  id: string;
  severity: Severity;
  problem: string;
  whyModelsStruggle: string;
  recommendedFix: string;
}

export const recommendations: RecommendationItem[] = [
  {
    id: "r1",
    severity: "critical",
    problem: "Landing page lacks semantic clarity for your core entity.",
    whyModelsStruggle:
      "Models merge you with adjacent vendors because the page never states a crisp entity type, category, and primary differentiator in the first 120 tokens.",
    recommendedFix:
      "Add explicit entity-focused descriptions: what you are, who you serve, and a bullet list of verifiable capabilities tied to schema.org types.",
  },
  {
    id: "r2",
    severity: "high",
    problem: "Sparse internal linking between proof and product surfaces.",
    whyModelsStruggle:
      "Citation engines reward navigable evidence chains. Isolated case studies do not reinforce the same entities as your pricing and integration pages.",
    recommendedFix:
      "Cross-link case studies to feature pages with shared anchors (e.g., “SOC 2”, “SSO”, “data residency”) and consistent naming.",
  },
  {
    id: "r3",
    severity: "medium",
    problem: "No machine-readable answers for high-intent comparison queries.",
    whyModelsStruggle:
      "When users ask “best GEO platform”, models pull from pages that directly answer the question format with structured Q/A blocks.",
    recommendedFix:
      "Publish a comparison hub with FAQPage JSON-LD and neutral evaluation criteria — not a sales sheet, but an evidence table.",
  },
  {
    id: "r4",
    severity: "medium",
    problem: "Docs use marketing tone instead of extractable claims.",
    whyModelsStruggle:
      "LLM answers favor short, testable statements. Narrative paragraphs get summarized incorrectly or omitted.",
    recommendedFix:
      "Rewrite key docs sections as claim + proof pairs (metric, methodology, link to primary source).",
  },
  {
    id: "r5",
    severity: "low",
    problem: "Brand mentions in third-party forums are uncited.",
    whyModelsStruggle:
      "Unstructured chatter rarely becomes a citation edge; models need attributable URLs with stable slugs.",
    recommendedFix:
      "Aggregate authoritative references (G2, peer blogs) and mirror factual snippets on your own changelog with citations.",
  },
];
