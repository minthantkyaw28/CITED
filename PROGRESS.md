# Progress log

Append-only. One line per task as it completes. Format:

`<task-id> — <YYYY-MM-DD> — <status> — <comma-separated files touched> — <one-line note>`

Status: `done` | `partial` | `blocked` | `failed`.

---
T1.1 — 2026-05-13 — done — app/models.py, app/stages/dashboard.py, app/main.py — Added live dashboard read-model endpoint with Cypher provenance and real KPI derivations.
T1.2 — 2026-05-13 — done — app/models.py, app/stages/competitors.py, app/main.py — Added competitor endpoint with graph-derived rows and intent summary.
T2.1 — 2026-05-13 — done — frontend/src/lib/api/types.ts, frontend/src/lib/api/client.ts, frontend/src/lib/api/stream.ts — Added typed frontend API client and SSE wrapper.
T2.2 — 2026-05-13 — done — frontend/src/lib/data/index.ts, frontend/.env.local.example — Added live-vs-mock data switchboard and example env defaults.
T3.3 — 2026-05-13 — done — frontend/src/app/(app)/dashboard/page.tsx, frontend/src/components/dashboard/dashboard-kpis.tsx, frontend/src/components/dashboard/dashboard-charts.tsx — Wired dashboard to live analysis ids with empty-state handling.
T3.4 — 2026-05-13 — done — frontend/src/app/(app)/graph/page.tsx, frontend/src/components/graph/citation-graph-view.tsx, frontend/src/lib/graph/flow-adapter.ts — Wired graph page to live data with runtime layout and payload normalization.
T3.6 — 2026-05-13 — done — frontend/src/app/(app)/competitors/page.tsx — Wired competitors page to live data and documented metric derivations in tooltips.

T1.5 — 2026-05-13 — done — app/main.py — CORSMiddleware added; ALLOWED_ORIGINS env var with `*` default; preflight verified
T1.3 — 2026-05-13 — done — app/graph_queries.py — rewrote to NeoNode/NeoEdge shape; derived geoScore/citationStrength/aiVisibility per brand; added Model nodes + RANKS edges; sources mapped to Keyword label; stub fallback updated
T1.4 — 2026-05-13 — done — app/stages/recommend.py — added _flatten_cards; output now includes top-level `cards` array shaped like frontend RecommendationItem; severity derived from Cypher result counts (source_breadth, centrality); provenance preserved per card
graceful-degrade — 2026-05-13 — done — app/neo4j_client.py — run_read/run_write swallow exceptions on unreachable Neo4j; endpoints render empty state instead of 500
E2E — 2026-05-13 — verified — /analyze, /dashboard, /competitors, /graph, /recommendations all respond in offline mode with correct shape and null/empty values
config — 2026-05-13 — done — app/config.py — switched defaults to https://llm.kimchi.dev/openai/v1 + CASTAI_API_KEY + kimi-k2.5 per sponsor docs (env-file overrides still apply)
T3.1 — 2026-05-13 — done — frontend/src/components/landing/hero-analyze.tsx — hero now calls startAnalysis() via @/lib/data and routes to /scan?url=…&id=…
T3.2 — 2026-05-13 — done — frontend/src/app/scan/scan-client.tsx — replaced setInterval/setTimeout with live subscribeToAnalysis(); progress derived from STAGE_ORDER; redirects to /dashboard?id=… on done
T3.5 — 2026-05-13 — done — frontend/src/app/(app)/recommendations/page.tsx, frontend/src/app/(app)/rewrite/page.tsx — both pages fetch via getRecommendations(); recommendations cards include `View graph evidence` disclosure with Cypher + result rows; rewrite page shows live H1+meta before/after with provenance
verify — 2026-05-13 — passed — frontend tsc --noEmit + npm run lint clean; backend healthz reports kimchi=true; CORS preflight returns access-control-allow-origin
