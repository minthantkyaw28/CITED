# CITED

Hackathon MVP: an **agentic AI visibility** demo — dark, graph-forward UI with mock data, simulated scans (Kimchi / Tessl), and a Neo4j-style citation graph (visualization only; no live database).

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), Framer Motion, React Flow (`@xyflow/react`), Recharts.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Analyze Website** on the landing page to run the simulated scan (~5s), then explore the dashboard shell (sidebar).

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

No authentication, crawling, LLM APIs, or Neo4j driver — all intelligence is **mocked** for a fast, investor-style demo.
