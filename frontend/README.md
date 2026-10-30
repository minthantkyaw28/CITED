# CITED

Frontend for the Cited hackathon MVP.

This app is no longer mock-only. It now supports:

- real `POST /analyze` runs against the FastAPI backend
- live SSE scan logs on `/scan`
- live dashboard / graph / competitors pages keyed by `analysis_id`
- live recommendations + rewrite pages backed by the same recommendation payload

The full project overview and backend setup now live in the repo-root README: [README.md](/Users/burgerking/cited/README.md).

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), Framer Motion, React Flow (`@xyflow/react`), Recharts.

## Run frontend locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For live data, make sure the backend is also running on `http://localhost:8000` and set:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCKS=0
```

To force frontend-only mock mode:

```env
NEXT_PUBLIC_USE_MOCKS=1
```

```bash
npm run build   # production check
npm start       # run production build
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing |
| `/scan` | Simulated agent pipeline + redirect to dashboard |
| `/dashboard` | KPIs, charts, insights |
| `/graph` | Interactive citation graph |
| `/recommendations` | Issue cards + link to rewrite |
| `/rewrite` | Split-pane rewrite studio |
| `/competitors` | Comparison table + insight |

Each app route should keep `?id=<analysis_id>` in the URL while navigating inside the app shell.

## Tessl (spec-driven agent skills)

This repo uses [Tessl](https://www.tessl.io/) skills for Cursor and other agents. Manifest: [`tessl.json`](tessl.json). Installed tiles live under [`.tessl/tiles/`](.tessl/tiles/).

**Prerequisites:** [Install the Tessl CLI](https://docs.tessl.io/introduction-to-tessl/installation.md) (`curl -fsSL https://get.tessl.io | sh` or `brew install tesslio/tap/tessl`), then `tessl login`.

**After clone** (if tiles are missing or you bump versions in `tessl.json`):

```bash
cd /path/to/CITED
tessl install
```

**Installed skills**

| Tile | Skill | Notes |
|------|--------|--------|
| [vercel-labs/next-skills](https://github.com/vercel-labs/next-skills) | `next-best-practices` | Primary fit for this Next.js 15 app |
| [neo4j-contrib/neo4j-skills](https://github.com/neo4j-contrib/neo4j-skills) | `neo4j-cypher-skill` | Graph/Cypher guidance; CITED uses mock Neo4j-style data only |
| [marmelab/atomic-crm](https://github.com/marmelab/atomic-crm) | `frontend-dev` | React/shadcn discipline; **ignore** ra-core / react-admin–specific rules (not used here) |

**CLI version:** Tessl `tessl install` for GitHub tiles uses the form `tessl install github:owner/repo --skill <name> --yes` (see `tessl install --help`).

## Notes

- The app shell preserves `analysis_id` across tab switches.
- Recommendations and rewrite reuse the same payload client-side for a given `analysis_id`.
- Graph rendering expects the backend Neo-shaped graph payload and computes layout client-side.
