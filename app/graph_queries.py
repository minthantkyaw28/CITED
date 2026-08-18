"""Read-side Cypher for the graph endpoint.

Output matches the frontend's NeoNode / NeoEdge shape exactly:
  NeoNode { id, labels: ["Brand"|"Competitor"|"Model"|"Keyword"|"Query"], properties{...} }
  NeoEdge { id, source, target, type: "MENTIONS"|"CITES"|"RANKS", strength? }

Per-node derived scores (live numbers, not invented):
  - geoScore        (Brand/Competitor) = brand's share of MENTIONS in this analysis × 100
  - citationStrength (Brand/Competitor) = sources cited alongside this brand / total sources × 100, in 0–1
  - aiVisibility     (Brand/Competitor) = distinct models mentioning brand / distinct models × 100

Stub fallback kept for offline demos.
"""
from app import neo4j_client


# Single pull. One pass over the analysis subgraph.
GRAPH_PULL_CYPHER = """
MATCH (a:Analysis {id: $aid})
OPTIONAL MATCH (a)-[:ABOUT]->(subject:Brand)
WITH a, subject

// All queries + the model responses they were asked to.
OPTIONAL MATCH (a)-[:RAN]->(q:Query)-[:ASKED_TO]->(mr:ModelResponse)
WITH a, subject,
     collect(DISTINCT q { .text, .intent }) AS queries,
     collect(DISTINCT mr { .model, q_text: q.text }) AS responses

// All distinct mentioned brands across the analysis.
OPTIONAL MATCH (a)-[:RAN]->(q2:Query)-[:ASKED_TO]->(mr2:ModelResponse)-[mrel:MENTIONS]->(b:Brand)
WITH a, subject, queries, responses,
     collect(DISTINCT b { .name, .url, .is_subject }) AS brands,
     collect(DISTINCT {model: mr2.model, q_text: q2.text,
              brand_name: b.name, brand_url: b.url, rank: mrel.rank}) AS mentions_raw

// All distinct cited sources.
OPTIONAL MATCH (a)-[:RAN]->(q3:Query)-[:ASKED_TO]->(mr3:ModelResponse)-[:CITES]->(s:Source)
WITH a, subject, queries, responses, brands, mentions_raw,
     collect(DISTINCT s { .url, .domain, .title }) AS sources,
     collect(DISTINCT {model: mr3.model, q_text: q3.text,
              source_url: s.url}) AS citations_raw

RETURN subject, queries, responses, brands, sources, mentions_raw, citations_raw
"""


def _safe_div(num: float, den: float) -> float:
    return (num / den) if den else 0.0


def _build_node(node_id: str, labels: list[str], **properties) -> dict:
    return {"id": node_id, "labels": labels, "properties": {k: v for k, v in properties.items() if v is not None}}


def _normalize_brand_name(name: str) -> str:
    return "".join(ch.lower() for ch in (name or "") if ch.isalnum())


async def fetch_graph(analysis_id: str) -> dict:
    rows = await neo4j_client.run_read(GRAPH_PULL_CYPHER, {"aid": analysis_id})
    if not rows or not rows[0].get("subject"):
        return _stub_graph(analysis_id)
    row = rows[0]

    subject = row["subject"]
    subject_name = subject["name"]
    brands = [b for b in (row.get("brands") or []) if b and b.get("name")]
    sources = [s for s in (row.get("sources") or []) if s and s.get("url")]
    queries = [q for q in (row.get("queries") or []) if q and q.get("text")]
    responses = [r for r in (row.get("responses") or []) if r and r.get("model")]
    mentions_raw = [m for m in (row.get("mentions_raw") or []) if m and m.get("brand_name")]
    citations_raw = [c for c in (row.get("citations_raw") or []) if c and c.get("source_url")]

    subject_key = _normalize_brand_name(subject_name)

    def canonical_brand_id(brand_name: str, brand_url: str | None = None) -> str:
        if _normalize_brand_name(brand_name) == subject_key:
            return f"brand:{subject_name}"
        if brand_url:
            return f"brand:{brand_url}"
        return f"brand:{brand_name}"

    # --- Aggregations for derived scores ---
    total_mentions = len(mentions_raw)
    total_models = len({r["model"] for r in responses if r.get("model")})

    mentions_per_brand: dict[str, int] = {}
    models_per_brand: dict[str, set[str]] = {}
    for m in mentions_raw:
        brand_id = canonical_brand_id(m["brand_name"], m.get("brand_url"))
        mentions_per_brand[brand_id] = mentions_per_brand.get(brand_id, 0) + 1
        models_per_brand.setdefault(brand_id, set()).add(m.get("model") or "")

    # citationStrength: fraction of total sources that co-occur with this brand
    # (i.e., were cited by a response that also mentioned the brand).
    total_sources = len(sources)
    sources_for_brand: dict[str, set[str]] = {}
    # group citations by (model, q_text) → set of source urls
    response_sources: dict[tuple[str, str], set[str]] = {}
    for c in citations_raw:
        key = (c.get("model") or "", c.get("q_text") or "")
        response_sources.setdefault(key, set()).add(c["source_url"])
    for m in mentions_raw:
        key = (m.get("model") or "", m.get("q_text") or "")
        srcs = response_sources.get(key, set())
        brand_id = canonical_brand_id(m["brand_name"], m.get("brand_url"))
        sources_for_brand.setdefault(brand_id, set()).update(srcs)

    def brand_scores(brand_id: str) -> dict:
        mcount = mentions_per_brand.get(brand_id, 0)
        return {
            "geoScore": round(_safe_div(mcount, total_mentions) * 100, 1) if total_mentions else None,
            "citationStrength": round(_safe_div(len(sources_for_brand.get(brand_id, set())), total_sources), 3) if total_sources else None,
            "aiVisibility": round(_safe_div(len(models_per_brand.get(brand_id, set())), total_models) * 100, 1) if total_models else None,
        }

    # --- Build nodes ---
    nodes: list[dict] = []
    seen: set[str] = set()

    def add(node: dict) -> None:
        if node["id"] in seen:
            return
        seen.add(node["id"])
        nodes.append(node)

    # Subject brand
    subject_id = f"brand:{subject_name}"
    sscores = brand_scores(subject_id)
    add(_build_node(
        subject_id,
        ["Brand"],
        name=subject_name,
        subtitle=subject.get("category") or "Your brand entity",
        **sscores,
    ))

    # Competitor brands
    for b in brands:
        brand_id = canonical_brand_id(b["name"], b.get("url"))
        if brand_id == subject_id:
            continue
        cscores = brand_scores(brand_id)
        add(_build_node(
            brand_id,
            ["Competitor"],
            name=b["name"],
            **cscores,
        ))

    # Source nodes (mapped to "Keyword" for the frontend — closest semantic match)
    for s in sources:
        add(_build_node(
            f"source:{s['url']}",
            ["Keyword"],
            name=s.get("title") or s["url"],
            subtitle=s.get("domain") or "",
        ))

    # Query nodes
    for q in queries:
        add(_build_node(
            f"query:{q['text']}",
            ["Query"],
            name=q["text"],
            subtitle=(q.get("intent") or "").replace("_", " ") or None,
        ))

    # Model nodes (one per distinct model name seen in this analysis)
    model_subtitles = {
        "gpt": "OpenAI answers", "openai": "OpenAI answers",
        "claude": "Long-context synthesis", "anthropic": "Long-context synthesis",
        "perplexity": "Citations-first", "pplx": "Citations-first",
        "gemini": "Google answers", "llama": "Open-weights",
    }
    for r in responses:
        m_name = r["model"]
        key = next((v for k, v in model_subtitles.items() if k in m_name.lower()), "Answer model")
        add(_build_node(
            f"model:{m_name}",
            ["Model"],
            name=m_name,
            subtitle=key,
        ))

    # --- Build edges ---
    edges: list[dict] = []
    edge_id = 0

    def push_edge(source: str, target: str, etype: str, strength: float | None = None) -> None:
        nonlocal edge_id
        edge_id += 1
        e = {"id": f"e{edge_id}", "source": source, "target": target, "type": etype}
        if strength is not None:
            e["strength"] = round(strength, 3)
        edges.append(e)

    # MENTIONS: model → brand. strength = 1/rank if rank present else 0.5
    seen_edges: set[tuple[str, str, str]] = set()
    for m in mentions_raw:
        src = f"model:{m['model']}"
        tgt = canonical_brand_id(m["brand_name"], m.get("brand_url"))
        if src not in seen or tgt not in seen:
            continue
        key = (src, tgt, "MENTIONS")
        if key in seen_edges:
            continue
        seen_edges.add(key)
        rank = m.get("rank") or 0
        strength = (1.0 / rank) if rank and rank > 0 else 0.5
        push_edge(src, tgt, "MENTIONS", strength)

    # CITES: model → source
    for c in citations_raw:
        src = f"model:{c['model']}"
        tgt = f"source:{c['source_url']}"
        if src not in seen or tgt not in seen:
            continue
        key = (src, tgt, "CITES")
        if key in seen_edges:
            continue
        seen_edges.add(key)
        push_edge(src, tgt, "CITES", 1.0)

    # RANKS: model → query (derived from ASKED_TO)
    for r in responses:
        if not r.get("q_text"):
            continue
        src = f"model:{r['model']}"
        tgt = f"query:{r['q_text']}"
        if src not in seen or tgt not in seen:
            continue
        key = (src, tgt, "RANKS")
        if key in seen_edges:
            continue
        seen_edges.add(key)
        push_edge(src, tgt, "RANKS", 1.0)

    return {"analysis_id": analysis_id, "nodes": nodes, "edges": edges}


def _stub_graph(analysis_id: str) -> dict:
    return {
        "analysis_id": analysis_id,
        "stub": True,
        "nodes": [
            _build_node("brand:Nimbus Labs", ["Brand"], name="Nimbus Labs",
                        subtitle="Your brand entity", geoScore=72, citationStrength=0.64, aiVisibility=68),
            _build_node("brand:Vertex Signal", ["Competitor"], name="Vertex Signal",
                        geoScore=88, citationStrength=0.91, aiVisibility=89),
            _build_node("model:stub-gpt", ["Model"], name="stub-gpt", subtitle="Stub model"),
            _build_node("query:best AI SEO tools", ["Query"], name="best AI SEO tools", subtitle="comparison"),
            _build_node("source:example.com", ["Keyword"], name="example.com", subtitle="example.com"),
        ],
        "edges": [
            {"id": "e1", "source": "model:stub-gpt", "target": "query:best AI SEO tools", "type": "RANKS", "strength": 1.0},
            {"id": "e2", "source": "model:stub-gpt", "target": "brand:Nimbus Labs", "type": "MENTIONS", "strength": 0.5},
            {"id": "e3", "source": "model:stub-gpt", "target": "brand:Vertex Signal", "type": "MENTIONS", "strength": 1.0},
            {"id": "e4", "source": "model:stub-gpt", "target": "source:example.com", "type": "CITES", "strength": 1.0},
        ],
    }
