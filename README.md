# Cited

Cited is a hackathon MVP for mapping **AI visibility / GEO** across LLMs.

Paste a landing page URL and the app will:

- infer the brand + category
- generate buyer-intent queries
- fan those queries out across a Kimchi allowlist of models
- extract mentioned brands, cited sources, and topics
- write the result into Neo4j
- render live dashboard, graph, competitors, recommendations, and rewrite views

The frontend lives in [frontend](/Users/burgerking/cited/frontend) and the backend lives in [app](/Users/burgerking/cited/app).

## Stack

- Backend: FastAPI, Neo4j, Kimchi gateway, SSE
- Frontend: Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, `@xyflow/react`, Recharts

## Run locally

1. Create a venv and install backend deps:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Install frontend deps:

```bash
cd frontend
npm install
cd ..
```

3. Configure `.env`.

Example demo-safe settings:

```env
KIMCHI_BASE_URL=https://llm.kimchi.dev/openai/v1
CASTAI_API_KEY=...

NEO4J_URI=neo4j+s://...
NEO4J_USER=neo4j
NEO4J_PASSWORD=...

KIMCHI_MODEL_ALLOWLIST=gpt-4o-mini,gpt-4.1-mini,gpt-4o,gpt-4.1,o4-mini,kimi-k2.5
KIMCHI_FAST_MODEL=kimi-k2.5
KIMCHI_EXTRACT_MODEL=gpt-4o-mini
KIMCHI_RECOMMEND_MODEL=gpt-4o-mini
QUERY_PLAN_MAX=12
QUERY_FANOUT_CONCURRENCY=4
```

4. Start both apps:

```bash
./dev.sh
```

Or separately:

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm run dev
```

Open:

- frontend: `http://localhost:3000`
- backend health: `http://localhost:8000/healthz`
- backend docs: `http://localhost:8000/docs`

## How it works

Pipeline stages:

1. `discover` fetches the page and infers brand/category
2. `plan` generates buyer-intent queries, with deterministic fallback if the LLM under-produces
3. `query_fanout` runs `(query × model)` across the Kimchi allowlist
4. `extract` parses each answer into brands, citations, and topics
5. `write_graph` writes the analysis to Neo4j
6. `recommend` runs lazily when `/recommendations` or `/rewrite` is opened

The scan page consumes the backend SSE stream at `/analyze/{id}/stream`.

## App routes

- `/` landing page + analyze form
- `/scan?id=...` live pipeline log
- `/dashboard?id=...` graph-derived KPIs/charts
- `/graph?id=...` citation graph
- `/competitors?id=...` competitor table
- `/recommendations?id=...` recommendation cards with Cypher provenance
- `/rewrite?id=...` landing-page rewrite view

The `analysis_id` in the query string is the contract between pages.

## Notes

- The backend keeps some request-local state in memory, so restarting the backend clears live analysis state and page extracts.
- Neo4j remains the durable source of graph data.
- The frontend caches recommendation payloads per `analysis_id` so `Recommendations` and `Rewrite` reuse the same loaded data.
- `cache.sqlite` is a local LLM response cache used by the backend.
