import type { NeoEdge, NeoNode } from "./types";

/** Neo4j-shaped property graph — visualization only (no live Neo4j). */
export const graphNodes: NeoNode[] = [
  {
    id: "brand-1",
    labels: ["Brand"],
    properties: {
      name: "Nimbus Labs",
      geoScore: 72,
      citationStrength: 0.64,
      aiVisibility: 68,
      subtitle: "Your brand entity",
    },
  },
  {
    id: "comp-a",
    labels: ["Competitor"],
    properties: {
      name: "Vertex Signal",
      geoScore: 88,
      citationStrength: 0.91,
      aiVisibility: 89,
    },
  },
  {
    id: "comp-b",
    labels: ["Competitor"],
    properties: {
      name: "Atlas GEO",
      geoScore: 81,
      citationStrength: 0.78,
      aiVisibility: 76,
    },
  },
  {
    id: "comp-c",
    labels: ["Competitor"],
    properties: {
      name: "Northbeam AI",
      geoScore: 74,
      citationStrength: 0.71,
      aiVisibility: 72,
    },
  },
  {
    id: "model-gpt",
    labels: ["Model"],
    properties: { name: "ChatGPT", subtitle: "OpenAI answers" },
  },
  {
    id: "model-pplx",
    labels: ["Model"],
    properties: { name: "Perplexity", subtitle: "Citations-first" },
  },
  {
    id: "model-claude",
    labels: ["Model"],
    properties: { name: "Claude", subtitle: "Long-context synthesis" },
  },
  {
    id: "kw-geo",
    labels: ["Keyword"],
    properties: { name: "generative engine optimization" },
  },
  {
    id: "kw-ai-seo",
    labels: ["Keyword"],
    properties: { name: "AI search visibility" },
  },
  {
    id: "kw-citations",
    labels: ["Keyword"],
    properties: { name: "AI citations" },
  },
  {
    id: "q1",
    labels: ["Query"],
    properties: {
      name: "best AI SEO tools",
      citationStrength: 0.42,
      aiVisibility: 55,
      subtitle: "Buyer intent · evaluation",
    },
  },
  {
    id: "q2",
    labels: ["Query"],
    properties: {
      name: "best GEO platform",
      citationStrength: 0.38,
      aiVisibility: 49,
      subtitle: "High commercial intent",
    },
  },
  {
    id: "q3",
    labels: ["Query"],
    properties: {
      name: "top AI marketing software",
      citationStrength: 0.51,
      aiVisibility: 61,
      subtitle: "Category leadership",
    },
  },
];

export const graphEdges: NeoEdge[] = [
  { id: "e1", source: "model-gpt", target: "q1", type: "RANKS", strength: 0.9 },
  { id: "e2", source: "model-pplx", target: "q1", type: "CITES", strength: 0.85 },
  { id: "e3", source: "model-claude", target: "q2", type: "RANKS", strength: 0.8 },
  { id: "e4", source: "q1", target: "comp-a", type: "MENTIONS", strength: 0.92 },
  { id: "e5", source: "q1", target: "brand-1", type: "MENTIONS", strength: 0.35 },
  { id: "e6", source: "q2", target: "comp-b", type: "CITES", strength: 0.79 },
  { id: "e7", source: "q2", target: "brand-1", type: "MENTIONS", strength: 0.31 },
  { id: "e8", source: "q3", target: "comp-c", type: "MENTIONS", strength: 0.68 },
  { id: "e9", source: "q3", target: "brand-1", type: "CITES", strength: 0.44 },
  { id: "e10", source: "kw-geo", target: "q2", type: "RANKS", strength: 0.7 },
  { id: "e11", source: "kw-ai-seo", target: "q1", type: "RANKS", strength: 0.75 },
  { id: "e12", source: "kw-citations", target: "q3", type: "RANKS", strength: 0.72 },
  { id: "e13", source: "brand-1", target: "kw-geo", type: "MENTIONS", strength: 0.55 },
  { id: "e14", source: "comp-a", target: "kw-ai-seo", type: "CITES", strength: 0.88 },
];

/** Hand-tuned layout for demo (simulates force-directed result). */
export const graphLayout: Record<string, { x: number; y: number }> = {
  "brand-1": { x: 420, y: 280 },
  "comp-a": { x: 120, y: 80 },
  "comp-b": { x: 680, y: 100 },
  "comp-c": { x: 200, y: 480 },
  "model-gpt": { x: 520, y: 40 },
  "model-pplx": { x: 720, y: 220 },
  "model-claude": { x: 80, y: 260 },
  "kw-geo": { x: 580, y: 420 },
  "kw-ai-seo": { x: 320, y: 120 },
  "kw-citations": { x: 640, y: 480 },
  q1: { x: 280, y: 220 },
  q2: { x: 520, y: 200 },
  q3: { x: 400, y: 400 },
};
