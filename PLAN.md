# Cited — backend ↔ frontend integration plan

Status target: A — derive proxies from real graph stats. Honest numbers, scaled where needed. The graph + recommendations are real; the dashboard metrics are derivations of real edge counts and citation patterns, not invented.

This plan is split into discrete tasks. Each task lists its **owner** (`anson` = me, `codex` = delegated), **inputs**, **outputs**, **acceptance criteria**, and **files to touch**. Tasks within a phase can run in parallel; phases run in order.

Workspace layout (already exists):
- Backend repo: `/Users/burgerking/cited` (FastAPI, Neo4j, Kimchi)
- Frontend repo: `/Users/burgerking/cited/frontend` (Next.js 15, vendored as a sibling tree, not a submodule)

Both share localhost: backend on `:8000`, frontend on `:3000` during dev.

---

## Phase 0 — Decisions locked

These are not up for debate during execution. If a task can't proceed under them, escalate, don't drift.

- **Run model:** separate dev servers (`uvicorn :8000`, `next dev :3000`) with CORS on the backend. Production-mode single-origin is a stretch goal, not a P0.
- **Analysis ID is the contract.** `POST /analyze` returns `{ analysis_id }`. Every downstream call is keyed by it. The frontend stores it in the URL (`?id=…`) for shareability; sessionStorage is a fallback only.
- **Provenance is preserved everywhere.** Every recommendation row keeps its `provenance.cypher` + `provenance.result`. The frontend may collapse it behind a disclosure but must not strip it.
- **Scoring proxies are documented.** Every derived metric has a one-line comment in code naming the Cypher it came from. No magic numbers in adapters.
- **No new mocks.** If a piece of data isn't yet computable, return `null` from the backend and let the frontend render an empty state. Do not invent values.

---

## Phase 1 — Backend metric endpoints (parallelizable)

The frontend needs four shapes the backend doesn't expose yet: dashboard KPIs, competitor rows, recommendation cards, and graph-in-Neo-shape. All four are pure Cypher reads + a thin transform layer.

### T1.1 — `GET /analyze/{aid}/dashboard` *(codex)*

**Inputs:** analysis id.
**Outputs:** JSON matching the frontend's `kpiCards`, `visibilityTrend`, `citationsByModel`, `competitorBars`, `quickInsights` shapes (see [frontend/src/lib/mock/dashboard.ts](frontend/src/lib/mock/dashboard.ts)).

**Derivation rules:**
- `geoScore` (0–100) = subject's share of total `MENTIONS` in this analysis × 100, floored at 5. Cypher: `MATCH (a:Analysis {id:$aid})-[:RAN]->(:Query)-[:ASKED_TO]->(mr)-[m:MENTIONS]->(b) WITH count(m) AS total ...`
- `citationScore` = count of `(:Source)<-[:CITES]-(mr)-[:MENTIONS]->(subject)` / count of all `CITES` in analysis, × 100.
- `seoScore` = `null` for now. Document as "classic crawl signals not yet derived."
- `aiVisibilityScore` = number of distinct models whose responses mention the subject / total distinct models × 100.
- `visibilityTrend` = empty array. We have only one snapshot. Comment why.
- `citationsByModel` = group `CITES` by `mr.model`, count distinct sources. This is the realest dashboard metric we have — make it the headline chart.
- `competitorBars` = top 4 competitors by `MENTIONS` count, with the same `geoScore`/`citationScore` proxies as the subject.
- `quickInsights` = derived bullets — at least one each for: under-represented topics (from the topic-gap Cypher), highest-leverage source (from outreach Cypher), and competitor with most mentions above the subject.

**Files:** new `app/stages/dashboard.py`, new route in `app/main.py`, share Cypher with `app/stages/recommend.py`.

**Acceptance:** with a fresh Neo4j-loaded analysis, the response validates against a pydantic `DashboardPayload` model and every numeric field is either a real number or `null`. Provenance dict at the top level lists every Cypher used.

---

### T1.2 — `GET /analyze/{aid}/competitors` *(codex)*

**Inputs:** analysis id.
**Outputs:** list matching frontend's `CompetitorRow` (see [frontend/src/lib/mock/competitors.ts](frontend/src/lib/mock/competitors.ts)).

**Derivation:**
- One row per `Brand` that appears via `MENTIONS` in this analysis, including the subject (`isYou: true`).
- `aiMentions` = `COUNT(:MENTIONS)` to that brand.
- `citationFrequency` (0–100) = mentions of this brand / mentions of the most-mentioned brand × 100.
- `geoScore` = same formula as T1.1, applied per-brand.
- `semanticClarity` = `null` (not yet derivable). Frontend renders a dash.
- `aiReadability` = `null`.
- Top-level `insight` = `{ leader: <brand with highest geoScore>, summary: <one Cypher-derived sentence: which intent types they dominate> }`.

**Files:** new `app/stages/competitors.py`, new route.

**Acceptance:** rows are returned sorted desc by `aiMentions`; subject is always included; all numbers traceable to a single named Cypher.

---

### T1.3 — `GET /analyze/{aid}/graph` reshape *(anson)*

The existing endpoint returns `{from, to, type}` edges and ad-hoc node objects. The frontend wants `NeoNode { id, labels[], properties{name, geoScore?, citationStrength?, aiVisibility?, subtitle?} }` and `NeoEdge { id, source, target, type, strength? }` per [frontend/src/lib/mock/types.ts](frontend/src/lib/mock/types.ts).

**Changes:**
- Emit one `Model` node per distinct `mr.model` in the analysis.
- Subject `Brand` gets `labels: ["Brand"]`. Other brands get `labels: ["Competitor"]`.
- `Source` nodes map to `labels: ["Keyword"]` for the frontend (their `Keyword` label is closer to "external entity discussed in answers" than ours). Add a `subtitle` of the domain.
- Edges: `MENTIONS` stays; `CITES` stays; add a derived `RANKS` edge from `Model` → `Query` whenever `(q)-[:ASKED_TO]->(mr {model:...})` exists.
- `strength` on `MENTIONS` = 1 / `rank` (so rank 1 = 1.0).
- `strength` on `CITES` = 1.
- `strength` on `RANKS` = 1.
- Each node's `properties.geoScore`/`citationStrength`/`aiVisibility` = same derivations as T1.1/T1.2 (per-brand for brands, `null` for non-brand nodes).

**Files:** rewrite `app/graph_queries.py::fetch_graph`. Stub fallback path stays for offline.

**Acceptance:** Cypher hit count ≤ 3 per request (one big read, optional model list, optional centrality). Graph render in xyflow matches the topology written in stage 5.

---

### T1.4 — `GET /analyze/{aid}/recommendations` reshape *(anson)*

Frontend's `RecommendationItem` shape is `{ id, severity, problem, whyModelsStruggle, recommendedFix }`. We currently return `{ landing_page_rewrite, content_gaps, outreach_targets }`.

**Decision:** keep both. Add a `cards` array at the top level that flattens everything into the frontend's card shape, alongside the existing structured fields. The `/rewrite` page still consumes the structured `landing_page_rewrite` block.

**Derivation:**
- 1 card per content gap → severity by `source_breadth` (>=6 critical, >=3 high, else medium).
- 1 card per outreach target → severity `medium` by default, `high` if centrality >= 5.
- 1 card for landing-page rewrite → severity `critical` if any topic gaps exist, else `medium`.
- `whyModelsStruggle` = quote the relevant Cypher result row, not free LLM prose.
- `recommendedFix` = pulled from the existing rec's brief/draft_email/rationale.
- Each card carries `provenance` through.

**Files:** `app/stages/recommend.py::generate`.

**Acceptance:** every card has non-empty `problem`, `whyModelsStruggle`, `recommendedFix`. `provenance.result` is non-empty on at least one card per real run.

---

### T1.5 — CORS + same-origin toggle *(anson)*

Add `CORSMiddleware` allowing `http://localhost:3000` and `http://127.0.0.1:3000` in dev. Pull the allowed origin list from `ALLOWED_ORIGINS` env var (comma-separated). Default to `*` for hackathon ergonomics.

**Files:** `app/main.py`.

**Acceptance:** an `OPTIONS /analyze` from Origin `http://localhost:3000` returns 200 with the right headers. The /healthz endpoint is publicly reachable from the frontend dev server.

---

## Phase 2 — Frontend API adapter (parallelizable with Phase 1)

The frontend currently imports from `@/lib/mock/*`. We add a parallel module `@/lib/api/*` that fetches and translates. Pages are switched over one at a time in Phase 3. The mocks stay in the tree as a fallback when `NEXT_PUBLIC_USE_MOCKS=1`.

### T2.1 — API client + types *(codex)*

Create:
- `frontend/src/lib/api/client.ts` — typed fetchers: `startAnalysis(url)`, `getStatus(id)`, `getGraph(id)`, `getDashboard(id)`, `getCompetitors(id)`, `getRecommendations(id)`.
- `frontend/src/lib/api/types.ts` — TS types mirroring the backend's pydantic models, **plus** the existing `NeoNode`/`NeoEdge`/`CompetitorRow`/`RecommendationItem` re-exported for the adapter to fill.
- `frontend/src/lib/api/stream.ts` — a `subscribeToAnalysis(id, onEvent)` wrapper around `EventSource`, with auto-close on `stage === "done" | "failed"`.

**Base URL resolution:** `NEXT_PUBLIC_API_BASE_URL` env var, default `http://localhost:8000`.

**Acceptance:** `npm run lint` and `tsc --noEmit` pass. No runtime imports from `@/lib/mock` inside `@/lib/api`.

---

### T2.2 — Mocks-vs-live toggle *(codex)*

Create `frontend/src/lib/data/index.ts` that re-exports either from `@/lib/mock` or wraps `@/lib/api` based on `NEXT_PUBLIC_USE_MOCKS`. Page components import from `@/lib/data`, never from `@/lib/mock` directly.

**Acceptance:** flipping the env var swaps every page with no other code changes. Default in `.env.local.example` is `NEXT_PUBLIC_USE_MOCKS=0`.

---

## Phase 3 — Page wiring (sequential within page, parallel across pages)

Each subtask: replace the mock import with the data layer, hook into the analysis id from the URL, render an empty state when the backend returns `null`/`[]`.

### T3.1 — Hero form → POST → /scan *(anson)*

`HeroAnalyze` posts to `/analyze`, then `router.push('/scan?url=…&id=' + analysis_id)`.

**Files:** [frontend/src/components/landing/hero-analyze.tsx](frontend/src/components/landing/hero-analyze.tsx).

**Acceptance:** hitting "Analyze Website" with a real URL lands on `/scan?url=…&id=…` with a server-generated id in the query string.

---

### T3.2 — Scan page → live SSE *(anson)*

Replace `setInterval`/`setTimeout` in [scan-client.tsx](frontend/src/app/scan/scan-client.tsx) with `subscribeToAnalysis(id, …)`. Map each event to an `AgentLog` line — formatter lives in `@/lib/api/format.ts`. Redirect to `/dashboard?id=…` on `stage === "done"`, to `/scan?id=…&error=…` on `failed`.

**Files:** scan-client.tsx, new `frontend/src/lib/api/format.ts`.

**Acceptance:** the scan page log mirrors the backend's SSE log in real time. No fake timing logic remains.

---

### T3.3 — Dashboard wiring *(codex)*

Read `?id=` from URL. Fetch `getDashboard(id)`. Render `null` fields as em-dash. Components stay the same; only the data source changes.

**Files:** new `frontend/src/app/(app)/dashboard/page.tsx` (currently a static page), components under `frontend/src/components/dashboard/`.

**Acceptance:** with a real analysis id, KPI cards show derived numbers; `visibilityTrend` chart shows an empty state placeholder ("Trend builds over multiple runs"); `citationsByModel` is the real chart.

---

### T3.4 — Graph page wiring *(codex)*

Adapter: `getGraph(id)` returns the reshape from T1.3. Pass directly into `buildFlowGraph`. Drop `graphLayout` import — let xyflow layout it, or compute positions from a quick radial-by-label fallback.

**Files:** `frontend/src/lib/graph/flow-adapter.ts`, the graph page.

**Acceptance:** graph renders with the real nodes/edges from a stage-5 write; label colors and edge types match the brand/competitor/keyword/query/model schema.

---

### T3.5 — Recommendations + Rewrite pages *(anson)*

Recommendations page consumes `cards` from T1.4. Rewrite page consumes `landing_page_rewrite` (with `h1_before`/`after` and `meta_before`/`after`). Add a small disclosure component (`<details>`) that shows the `provenance.cypher` and `provenance.result` on each card — this is the demo's load-bearing trust mechanism.

**Files:** recommendations + rewrite pages, possibly new `frontend/src/components/recommendations/provenance.tsx`.

**Acceptance:** every card has a "View graph evidence" disclosure that, when opened, shows the Cypher and the actual rows. The /rewrite page shows the verbatim original H1 + meta on the left and the LLM rewrite on the right.

---

### T3.6 — Competitors page *(codex)*

Replace `competitorRows` mock with `getCompetitors(id)`. Render `null` fields as em-dashes. Keep the existing `competitorInsight` block, populate from the backend's `insight` field.

**Files:** competitors page + table component.

**Acceptance:** subject row is highlighted; every numeric column has a tooltip explaining the Cypher derivation.

---

## Phase 4 — Verification (sequential, anson)

### T4.1 — End-to-end smoke
Boot Neo4j Aura, set `.env` with real Kimchi creds, `./run.sh` + `cd frontend && npm run dev`. Paste a real URL into the hero. Walk through every page. Verify provenance disclosures land on real Cypher results.

### T4.2 — Empty-state walkthrough
With no analysis id in the URL (e.g., someone deep-links `/dashboard`), every page shows a "Run an analysis first" CTA pointing back to `/`.

### T4.3 — Failure walkthrough
Kill Neo4j mid-run. Confirm the scan page surfaces the `failed` event and the dashboard renders empty-state with the failure reason.

---

## Codex delegation contract (per task)

When delegating a task to codex, the prompt template is:

> Workspace: `/Users/burgerking/cited` (backend) and/or `/Users/burgerking/cited/frontend` (frontend). Read `PLAN.md` and the referenced task block in full before starting. Read `skills/cypher-for-citation-graphs/SKILL.md` if your task touches Cypher.
>
> Authority: edit files in your workspace, run tests, lint, typecheck. **Do not** commit, push, install new dependencies without flagging, or change architectural decisions. If blocked, report `blocked` with reason and recommended fix.
>
> Inputs / outputs / acceptance criteria are the ones listed in this plan, verbatim. Do not invent additional requirements.
>
> Deliverables: the files listed under **Files** in your task block. Plus an in-workspace doc at `docs/codex/<task-id>.md` summarizing: what changed, which Cypher you ended up running, what you couldn't do and why.
>
> Done when:
> - All files listed under **Files** exist and compile/lint/typecheck clean.
> - The **Acceptance** criteria for the task pass against a real (or stubbed) backend running on `http://localhost:8000`.
> - You've added a one-line entry to `PROGRESS.md` at the repo root: `T1.1 — <date> — done — <files touched>`.

Codex is allowed to ask one clarifying question via blocked-status if the plan is genuinely ambiguous for the task at hand. Otherwise it executes.

---

## Open questions (anson resolves before kicking off)

1. **Neo4j Aura credentials.** Without them, T4.1/T4.2/T4.3 can't run live. Workaround: a tiny `tests/fixtures/seed_neo4j.cypher` script that loads a hand-built analysis into a local `neo4j:5` Docker container. Worth doing regardless — it unblocks codex from needing my creds.
2. **`semanticClarity` and `aiReadability`.** These are competitor-row columns the frontend currently shows. We have no real derivation. Two options: drop the columns, or compute a crude proxy (e.g., `semanticClarity` = stddev of mention ranks for the brand; lower stddev = clearer entity). Decision before T1.2 ships.
3. **Topic vs Keyword.** Frontend mock has `Keyword` nodes; backend writes `Topic`. We're mapping `Source → Keyword` in T1.3, but that loses the actual `Topic` nodes. Possibly correct (frontend's `Keyword` is closer to our `Source`), but I want a second look before finalizing.
