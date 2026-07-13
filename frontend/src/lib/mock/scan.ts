export interface ScanPhase {
  atMs: number;
  line: string;
}

/** Staged fake agent logs — Kimchi + Tessl mentioned for demo narrative. */
export const scanPhases: ScanPhase[] = [
  { atMs: 0, line: "[·] Kimchi orchestrator: allocating warm worker pool (us-east)" },
  { atMs: 400, line: "[✓] Crawling pages — sitemap + rendered HTML snapshots" },
  { atMs: 900, line: "[✓] Extracting entities — Tessl skill: entity_extractor v2.4" },
  { atMs: 1600, line: "[✓] Running AI search queries — synthetic probe set (n=240)" },
  { atMs: 2400, line: "[✓] Comparing competitors — Vertex Signal, Atlas GEO, Northbeam AI" },
  { atMs: 3200, line: "[✓] Building citation graph — Neo4j-style property projection" },
  { atMs: 4000, line: "[✓] GEO scoring — readability + structure + evidence density" },
  { atMs: 4600, line: "[✓] Generating recommendations — Tessl skill: geo_rewrite_planner" },
];

export const SCAN_REDIRECT_MS = 5200;
// chore: note 2026-07-13T12:15:22
