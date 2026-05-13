"""Stage 6 — Recommendations.

Every recommendation type is a Cypher query first, an LLM call second.
The provenance field on every output carries the exact Cypher and rows so
judges can verify the graph is doing the work.
"""
import logging

from app import kimchi_client, neo4j_client
from app.config import settings
from app.llm_json import parse_into
from pydantic import BaseModel, Field

log = logging.getLogger(__name__)


SUBJECT_COPY_CYPHER = """
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
RETURN subject.name AS name, subject.url AS url,
       subject.positioning AS positioning, subject.category AS category
"""

TOPIC_GAP_CYPHER = """
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:CITES]->(s:Source)-[:DISCUSSES]->(t:Topic)
MATCH (mr)-[:MENTIONS]->(competitor:Brand)
WHERE competitor <> subject
WITH t, count(DISTINCT competitor) AS competitor_breadth,
     count(DISTINCT s) AS source_breadth,
     collect(DISTINCT s.title)[..5] AS sample_titles
WHERE NOT EXISTS { MATCH (:Brand {is_subject:true})-[:ASSOCIATED_WITH]->(t) }
RETURN t.name AS topic, competitor_breadth, source_breadth, sample_titles
ORDER BY source_breadth DESC, competitor_breadth DESC
LIMIT 8
"""

OUTREACH_CYPHER = """
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:CITES]->(s:Source)
WITH subject, s, count(DISTINCT mr) AS centrality
WHERE NOT EXISTS {
  MATCH (mr2:ModelResponse)-[:CITES]->(s)
  MATCH (mr2)-[:MENTIONS]->(subject)
}
RETURN s.url AS url, s.domain AS domain, s.title AS title, centrality
ORDER BY centrality DESC
LIMIT 8
"""


# ----- Pydantic outputs for the rewrite LLM call -----


class HeroRewrite(BaseModel):
    h1_before: str = ""
    h1_after: str = ""
    meta_before: str = ""
    meta_after: str = ""
    rationale: str = ""
    target_topics: list[str] = Field(default_factory=list)


class ContentGapBrief(BaseModel):
    title: str
    target_queries: list[str] = Field(default_factory=list)
    brief: str
    why_it_matters: str


class OutreachDraft(BaseModel):
    url: str
    why: str
    draft_email: str


# ----- The pipeline -----


async def _llm_json(system: str, user: str, model_cls):
    raw = await kimchi_client.chat(
        model=settings.KIMCHI_RECOMMEND_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        json_mode=True,
        temperature=0.4,
        max_tokens=600,
    )
    return parse_into(raw, model_cls)


REWRITE_SYSTEM = (
    "You rewrite landing-page copy so the brand is more retrievable by LLMs for "
    "specific buyer-intent topics. Quote the brand's current H1 and meta verbatim "
    "as 'before'. Propose a tighter 'after' that name-checks the high-leverage topics. "
    "Respond as STRICT JSON only:\n"
    '{"h1_before": str, "h1_after": str, "meta_before": str, "meta_after": str, '
    '"rationale": str, "target_topics": [str, ...]}'
)


async def _landing_rewrite(aid: str, subject: dict, gap_rows: list[dict], page_extract: dict | None) -> dict:
    cypher = TOPIC_GAP_CYPHER
    topics = [r["topic"] for r in gap_rows]
    h1 = (page_extract or {}).get("h1", "") or ""
    meta = (page_extract or {}).get("meta_description", "") or ""

    if not topics:
        return {
            "h1_before": h1,
            "h1_after": h1,
            "meta_before": meta,
            "meta_after": meta,
            "rationale": "No topic gaps found — graph contains no competitor-only topics.",
            "target_topics": [],
            "provenance": {"cypher": cypher, "params": {"aid": aid}, "result": gap_rows},
        }

    user_prompt = (
        f"Brand: {subject.get('name')}\n"
        f"Category: {subject.get('category')}\n"
        f"Positioning: {subject.get('positioning')}\n"
        f"Current H1: {h1}\n"
        f"Current META: {meta}\n"
        f"High-leverage topics (competitors own, subject doesn't): {topics}\n\n"
        "Return JSON only."
    )

    try:
        rewrite = await _llm_json(REWRITE_SYSTEM, user_prompt, HeroRewrite)
        out = rewrite.model_dump()
    except Exception as e:  # noqa: BLE001
        log.warning("rewrite LLM failed: %s", e)
        out = {
            "h1_before": h1, "h1_after": h1,
            "meta_before": meta, "meta_after": meta,
            "rationale": f"LLM rewrite failed: {e}",
            "target_topics": topics,
        }

    out["provenance"] = {"cypher": cypher, "params": {"aid": aid}, "result": gap_rows}
    return out


GAP_BRIEF_SYSTEM = (
    "You write a one-paragraph content brief for a topic the subject brand is "
    "currently absent from in LLM responses. Be specific. Respond STRICT JSON only:\n"
    '{"title": str, "target_queries": [str, ...], "brief": str, "why_it_matters": str}'
)


async def _content_gaps(aid: str, subject: dict, gap_rows: list[dict]) -> list[dict]:
    out: list[dict] = []
    for row in gap_rows[:5]:
        user = (
            f"Subject brand: {subject.get('name')} (category: {subject.get('category')})\n"
            f"Topic with a citation gap: {row['topic']}\n"
            f"Competitor breadth: {row['competitor_breadth']}\n"
            f"Source breadth: {row['source_breadth']}\n"
            f"Sample source titles: {row.get('sample_titles')}\n\n"
            "Return JSON only."
        )
        try:
            brief = await _llm_json(GAP_BRIEF_SYSTEM, user, ContentGapBrief)
            item = brief.model_dump()
        except Exception as e:  # noqa: BLE001
            log.warning("gap brief failed for %s: %s", row["topic"], e)
            item = {
                "title": row["topic"],
                "target_queries": [],
                "brief": "LLM brief generation failed; raw graph row preserved.",
                "why_it_matters": f"{row['competitor_breadth']} competitors discussed across {row['source_breadth']} sources.",
            }
        item["provenance"] = {
            "cypher": TOPIC_GAP_CYPHER,
            "params": {"aid": aid},
            "result": [row],
        }
        out.append(item)
    return out


OUTREACH_SYSTEM = (
    "You draft a short, specific outreach email to a source that already cites "
    "competing products in this category but has not mentioned the subject brand. "
    "Cite the graph leverage explicitly. Respond STRICT JSON only:\n"
    '{"url": str, "why": str, "draft_email": str}'
)


async def _outreach(aid: str, subject: dict, rows: list[dict]) -> list[dict]:
    out: list[dict] = []
    for row in rows[:5]:
        user = (
            f"Subject: {subject.get('name')} ({subject.get('category')})\n"
            f"Source URL: {row['url']}\n"
            f"Title: {row.get('title')}\n"
            f"Domain: {row.get('domain')}\n"
            f"Citation centrality (this analysis): {row['centrality']}\n\n"
            "Return JSON only."
        )
        try:
            draft = await _llm_json(OUTREACH_SYSTEM, user, OutreachDraft)
            item = draft.model_dump()
        except Exception as e:  # noqa: BLE001
            log.warning("outreach draft failed for %s: %s", row.get("url"), e)
            item = {
                "url": row["url"],
                "why": f"Centrality {row['centrality']} in this analysis; subject brand absent.",
                "draft_email": "Draft failed to generate; graph row preserved.",
            }
        item["provenance"] = {
            "cypher": OUTREACH_CYPHER,
            "params": {"aid": aid},
            "result": [row],
        }
        out.append(item)
    return out


def _flatten_cards(rewrite: dict, gaps: list[dict], outreach: list[dict]) -> list[dict]:
    """Flatten the three rec types into the frontend's RecommendationItem cards.
    Severity is derived from Cypher result counts, not invented.
    """
    cards: list[dict] = []

    # Landing-page rewrite — critical if topic gaps exist, else medium.
    gap_result = (rewrite.get("provenance") or {}).get("result") or []
    rewrite_severity = "critical" if gap_result else "medium"
    h1_before = (rewrite.get("h1_before") or "").strip() or "(no original H1 detected)"
    cards.append({
        "id": "rec-rewrite",
        "severity": rewrite_severity,
        "problem": "Landing-page hero copy is under-optimized for LLM retrieval.",
        "whyModelsStruggle": (
            f'Current H1 — "{h1_before}" — does not name-check the {len(gap_result)} '
            f"high-leverage topic{'s' if len(gap_result) != 1 else ''} competitors own in answer-engine responses."
            if gap_result
            else "No topic gaps detected; rewrite is a low-priority polish pass."
        ),
        "recommendedFix": rewrite.get("rationale") or "Tighten the hero around the topics judges are likely to ask about.",
        "provenance": rewrite.get("provenance"),
    })

    # Content gaps — severity by source_breadth.
    for i, g in enumerate(gaps):
        prov = g.get("provenance") or {}
        row = (prov.get("result") or [{}])[0]
        source_breadth = row.get("source_breadth") or 0
        if source_breadth >= 6:
            sev = "critical"
        elif source_breadth >= 3:
            sev = "high"
        else:
            sev = "medium"
        cards.append({
            "id": f"rec-gap-{i+1}",
            "severity": sev,
            "problem": f"Topic gap: {g.get('title') or row.get('topic') or 'unnamed'}.",
            "whyModelsStruggle": (
                f"{row.get('competitor_breadth', 0)} competitor brands discussed across "
                f"{source_breadth} sources on this topic — subject brand absent."
            ),
            "recommendedFix": g.get("brief") or g.get("why_it_matters") or "",
            "provenance": prov,
        })

    # Outreach — severity by centrality.
    for i, o in enumerate(outreach):
        prov = o.get("provenance") or {}
        row = (prov.get("result") or [{}])[0]
        centrality = row.get("centrality") or 0
        sev = "high" if centrality >= 5 else "medium"
        cards.append({
            "id": f"rec-outreach-{i+1}",
            "severity": sev,
            "problem": f"High-leverage source missing your brand: {row.get('domain') or row.get('url') or 'unknown'}.",
            "whyModelsStruggle": (
                f"This source has citation centrality {centrality} in this analysis but "
                f"does not currently mention the subject brand."
            ),
            "recommendedFix": o.get("draft_email") or o.get("why") or "",
            "provenance": prov,
        })

    return cards


async def generate(analysis_id: str, page_extract: dict | None = None) -> dict:
    subject_rows = await neo4j_client.run_read(SUBJECT_COPY_CYPHER, {"aid": analysis_id})
    subject = subject_rows[0] if subject_rows else {}

    gap_rows = await neo4j_client.run_read(TOPIC_GAP_CYPHER, {"aid": analysis_id})
    outreach_rows = await neo4j_client.run_read(OUTREACH_CYPHER, {"aid": analysis_id})

    rewrite = await _landing_rewrite(analysis_id, subject, gap_rows, page_extract)
    gaps = await _content_gaps(analysis_id, subject, gap_rows)
    outreach = await _outreach(analysis_id, subject, outreach_rows)
    cards = _flatten_cards(rewrite, gaps, outreach)

    return {
        "landing_page_rewrite": rewrite,
        "content_gaps": gaps,
        "outreach_targets": outreach,
        "cards": cards,
        "subject": subject,
    }
