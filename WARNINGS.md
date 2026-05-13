# Warnings — known issues to address later

## 1. Concurrency cap may be too high for Kimchi

`QUERY_FANOUT_CONCURRENCY` defaults to 20 in [app/config.py](app/config.py). Kimchi may rate-limit harder than that. Per-call failures are logged and skipped (pipeline keeps running), but a too-high cap will show up as lots of dropped responses in the SSE log.

**Fix:** tune via the `QUERY_FANOUT_CONCURRENCY` env var. Start lower (e.g. 8) if you see 429s, then raise.

## 2. `Brand.is_subject` can flip across analyses

The topic-gap Cypher in [skills/cypher-for-citation-graphs/SKILL.md](skills/cypher-for-citation-graphs/SKILL.md) and [app/stages/recommend.py](app/stages/recommend.py) depends on `Brand.is_subject = true` only on the current subject.

`SEED_CYPHER` in [app/stages/write_graph.py](app/stages/write_graph.py) sets `is_subject = true` on the subject of the current analysis. Competitors get nodes via `MENTIONS` with `ON CREATE SET ... is_subject = false`.

**The hazard:** if a competitor in analysis A is later the subject of analysis B (or vice versa), the flag flips on the shared `Brand` node. Subsequent reads against analysis A will treat the wrong brand as subject.

**Fix options:**
- Move `is_subject` off the `Brand` node and onto the `(Analysis)-[:ABOUT]->(Brand)` edge.
- Or scope every read with `MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)` and stop using `Brand.is_subject` as a filter. (The recommend.py reads already do this; the SKILL.md examples and the `COMPETES_WITH` derivation still use the flag.)

Pre-demo: low risk if you only run one analysis per brand. Long-term: fix.
