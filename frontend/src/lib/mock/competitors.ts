export interface CompetitorRow {
  name: string;
  isYou?: boolean;
  geoScore: number;
  aiMentions: number;
  citationFrequency: number;
  semanticClarity: number;
  aiReadability: number;
}

export const competitorRows: CompetitorRow[] = [
  {
    name: "Nimbus Labs",
    isYou: true,
    geoScore: 72,
    aiMentions: 1840,
    citationFrequency: 64,
    semanticClarity: 71,
    aiReadability: 58,
  },
  {
    name: "Vertex Signal",
    geoScore: 88,
    aiMentions: 5120,
    citationFrequency: 91,
    semanticClarity: 89,
    aiReadability: 86,
  },
  {
    name: "Atlas GEO",
    geoScore: 81,
    aiMentions: 3890,
    citationFrequency: 78,
    semanticClarity: 82,
    aiReadability: 79,
  },
  {
    name: "Northbeam AI",
    geoScore: 74,
    aiMentions: 2650,
    citationFrequency: 71,
    semanticClarity: 76,
    aiReadability: 72,
  },
  {
    name: "SignalForge",
    geoScore: 69,
    aiMentions: 1980,
    citationFrequency: 62,
    semanticClarity: 68,
    aiReadability: 65,
  },
];

export const competitorInsight = {
  leader: "Vertex Signal",
  summary:
    "Vertex Signal dominates AI citations on evaluation queries because their docs expose structured FAQ content, consistent entity IDs across pages, and machine-verifiable claims that map cleanly to buyer-intent questions.",
};
