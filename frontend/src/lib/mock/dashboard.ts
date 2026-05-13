export const kpiCards = [
  {
    id: "geo",
    title: "GEO Score",
    value: 72,
    delta: "+4.2%",
    hint: "Entity clarity vs. category leaders",
    accent: "cyan" as const,
  },
  {
    id: "citation",
    title: "AI Citation Score",
    value: 64,
    delta: "−1.8%",
    hint: "Share of attributed mentions in AI answers",
    accent: "purple" as const,
  },
  {
    id: "seo",
    title: "SEO Score",
    value: 81,
    delta: "+0.6%",
    hint: "Classic crawl signals (baseline)",
    accent: "blue" as const,
  },
  {
    id: "visibility",
    title: "AI Visibility Score",
    value: 68,
    delta: "+6.1%",
    hint: "Modeled appearance across answer surfaces",
    accent: "magenta" as const,
  },
];

export const visibilityTrend = [
  { week: "W1", cited: 42, modeled: 38 },
  { week: "W2", cited: 45, modeled: 41 },
  { week: "W3", cited: 48, modeled: 44 },
  { week: "W4", cited: 52, modeled: 49 },
  { week: "W5", cited: 55, modeled: 53 },
  { week: "W6", cited: 58, modeled: 56 },
  { week: "W7", cited: 61, modeled: 59 },
  { week: "W8", cited: 64, modeled: 62 },
];

export const citationsByModel = [
  { model: "ChatGPT", count: 128 },
  { model: "Perplexity", count: 94 },
  { model: "Claude", count: 76 },
  { model: "Gemini", count: 61 },
];

export const competitorBars = [
  { name: "You", geo: 72, citations: 64 },
  { name: "Vertex Signal", geo: 88, citations: 91 },
  { name: "Atlas GEO", geo: 81, citations: 78 },
  { name: "Northbeam AI", geo: 74, citations: 71 },
];

export const quickInsights = [
  {
    title: "Semantic weaknesses",
    detail:
      "Product pages describe outcomes without anchoring entity types models use for disambiguation (SoftwareApplication vs. Service).",
  },
  {
    title: "FAQ schema missing",
    detail:
      "No JSON-LD FAQ on pricing and security pages — competitors capture long-tail buyer questions in AI summaries.",
  },
  {
    title: "Competitor domination",
    detail:
      "Vertex Signal owns comparison queries; their docs graph links features to named entities you do not surface.",
  },
  {
    title: "Low AI readability",
    detail:
      "Dense hero copy scores high for humans but low for extractive answers — models prefer scannable claim lists.",
  },
];
