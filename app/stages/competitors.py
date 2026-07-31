from app import neo4j_client
from app.models import CompetitorInsight, CompetitorRow, CompetitorsPayload
from app.stages.dashboard import ANALYSIS_TOTALS_CYPHER, BRAND_METRICS_CYPHER, _geo_score, _merge_subject_alias_rows

INTENT_LEADERSHIP_CYPHER = """
MATCH (a:Analysis {id: $aid})-[:RAN]->(q:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:MENTIONS]->(brand:Brand)
RETURN brand.name AS name, q.intent AS intent, count(*) AS mentions
ORDER BY name, mentions DESC, intent
"""


def _citation_frequency(mentions: int, max_mentions: int) -> float | None:
    if max_mentions <= 0:
        return None
    return round((mentions / max_mentions) * 100, 1)


def _build_insight(rows: list[dict], intent_rows: list[dict]) -> CompetitorInsight:
    if not rows:
        return CompetitorInsight(
            leader="",
            summary="No brand mentions have been written to the graph for this analysis yet.",
        )

    leader = max(rows, key=lambda row: (row.geoScore or 0, row.aiMentions, row.name))
    leader_intents = [row for row in intent_rows if row.get("name") == leader.name]
    top_intents = [str(row.get("intent")) for row in leader_intents[:2] if row.get("intent")]

    if top_intents:
        summary = (
            f"dominates {', '.join(top_intents)} intent queries in this snapshot, based on the "
            "highest mention share across captured model responses."
        )
    else:
        summary = "leads the current snapshot on overall mention share, but no intent split was captured."

    return CompetitorInsight(leader=leader.name, summary=summary)


async def fetch(analysis_id: str) -> CompetitorsPayload:
    totals_rows = await neo4j_client.run_read(ANALYSIS_TOTALS_CYPHER, {"aid": analysis_id})
    totals = totals_rows[0] if totals_rows else {}
    total_mentions = int(totals.get("total_mentions") or 0)

    brand_rows = _merge_subject_alias_rows(await neo4j_client.run_read(BRAND_METRICS_CYPHER, {"aid": analysis_id}))
    intent_rows = await neo4j_client.run_read(INTENT_LEADERSHIP_CYPHER, {"aid": analysis_id})
    max_mentions = max((int(row.get("mention_count") or 0) for row in brand_rows), default=0)

    rows = [
        CompetitorRow(
            name=str(row.get("name") or "Unknown"),
            isYou=bool(row.get("is_subject")),
            geoScore=_geo_score(int(row.get("mention_count") or 0), total_mentions),
            aiMentions=int(row.get("mention_count") or 0),
            citationFrequency=_citation_frequency(int(row.get("mention_count") or 0), max_mentions),
            semanticClarity=None,
            aiReadability=None,
        )
        for row in brand_rows
    ]

    return CompetitorsPayload(
        rows=rows,
        insight=_build_insight(rows, intent_rows),
        provenance={
            "brand_metrics": BRAND_METRICS_CYPHER.strip(),
            "intent_leadership": INTENT_LEADERSHIP_CYPHER.strip(),
            "semanticClarity": "null: not yet derivable from the current graph schema.",
            "aiReadability": "null: not yet derivable from the current graph schema.",
        },
    )
# chore: note 2026-07-31T15:31:00
