import math

from app import neo4j_client
from app.models import (
    CitationByModel,
    CompetitorBar,
    DashboardPayload,
    KpiCard,
    QuickInsight,
)
from app.stages.recommend import OUTREACH_CYPHER, TOPIC_GAP_CYPHER

ANALYSIS_TOTALS_CYPHER = """
MATCH (a:Analysis {id: $aid})
CALL (a) {
  OPTIONAL MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(:ModelResponse)-[m:MENTIONS]->(:Brand)
  RETURN count(m) AS total_mentions
}
CALL (a) {
  OPTIONAL MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(:ModelResponse)-[c:CITES]->(:Source)
  RETURN count(c) AS total_citations
}
CALL (a) {
  OPTIONAL MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)
  RETURN count(DISTINCT mr.model) AS total_models
}
RETURN total_mentions, total_citations, total_models
"""

BRAND_METRICS_CYPHER = """
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
CALL (a) {
  OPTIONAL MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(:ModelResponse)-[:MENTIONS]->(mentioned:Brand)
  RETURN collect(DISTINCT mentioned) AS mentioned_brands
}
WITH a, subject, mentioned_brands + [subject] AS brands
UNWIND brands AS brand
WITH a, subject, brand
WHERE brand IS NOT NULL
WITH a, subject, collect(DISTINCT brand) AS deduped
UNWIND deduped AS brand
CALL (a, brand) {
  OPTIONAL MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[m:MENTIONS]->(brand)
  RETURN count(m) AS mention_count, count(DISTINCT mr.model) AS model_mentions
}
CALL (a, brand) {
  OPTIONAL MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:MENTIONS]->(brand)
  OPTIONAL MATCH (mr)-[c:CITES]->(:Source)
  RETURN count(c) AS citation_edge_count
}
RETURN brand.name AS name,
       brand.url AS url,
       brand = subject AS is_subject,
       mention_count,
       citation_edge_count,
       model_mentions
ORDER BY mention_count DESC, name
"""

CITATIONS_BY_MODEL_CYPHER = """
MATCH (a:Analysis {id: $aid})-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:CITES]->(s:Source)
RETURN mr.model AS model, count(DISTINCT s) AS count
ORDER BY count DESC, model
"""

COMPETITOR_DIFF_CYPHER = """
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)
MATCH (mr)-[r1:MENTIONS]->(subject)
MATCH (mr)-[r2:MENTIONS]->(other:Brand)
WHERE other <> subject AND r2.rank < r1.rank
RETURN other.name AS competitor, count(*) AS times_ranked_above
ORDER BY times_ranked_above DESC
LIMIT 1
"""


def _percentage(numerator: float, denominator: float) -> float | None:
    if denominator <= 0:
        return None
    return round((numerator / denominator) * 100, 1)


def _geo_score(mentions: int, total_mentions: int) -> float | None:
    share = _percentage(mentions, total_mentions)
    if share is None:
        return None
    return float(max(5, math.floor(share))) if mentions > 0 else 0.0


async def fetch(analysis_id: str) -> DashboardPayload:
    totals_rows = await neo4j_client.run_read(ANALYSIS_TOTALS_CYPHER, {"aid": analysis_id})
    totals = totals_rows[0] if totals_rows else {}
    total_mentions = int(totals.get("total_mentions") or 0)
    total_citations = int(totals.get("total_citations") or 0)
    total_models = int(totals.get("total_models") or 0)

    brand_rows = await neo4j_client.run_read(BRAND_METRICS_CYPHER, {"aid": analysis_id})
    citations_by_model_rows = await neo4j_client.run_read(CITATIONS_BY_MODEL_CYPHER, {"aid": analysis_id})
    topic_gap_rows = await neo4j_client.run_read(TOPIC_GAP_CYPHER, {"aid": analysis_id})
    outreach_rows = await neo4j_client.run_read(OUTREACH_CYPHER, {"aid": analysis_id})
    competitor_diff_rows = await neo4j_client.run_read(COMPETITOR_DIFF_CYPHER, {"aid": analysis_id})

    subject_row = next((row for row in brand_rows if row.get("is_subject")), None)
    subject_mentions = int(subject_row.get("mention_count") or 0) if subject_row else 0
    subject_citations = int(subject_row.get("citation_edge_count") or 0) if subject_row else 0
    subject_models = int(subject_row.get("model_mentions") or 0) if subject_row else 0

    kpi_cards = [
        KpiCard(
            id="geo",
            title="GEO Score",
            value=_geo_score(subject_mentions, total_mentions),
            delta=None,
            hint="Subject mention share across all citation-graph mentions.",
            accent="cyan",
        ),
        KpiCard(
            id="citation",
            title="AI Citation Score",
            value=_percentage(subject_citations, total_citations),
            delta=None,
            hint="CITE edges attached to responses that mention the subject brand.",
            accent="purple",
        ),
        KpiCard(
            id="seo",
            title="SEO Score",
            value=None,
            delta=None,
            hint="Classic crawl signals not yet derived from the graph.",
            accent="blue",
        ),
        KpiCard(
            id="visibility",
            title="AI Visibility Score",
            value=_percentage(subject_models, total_models),
            delta=None,
            hint="Distinct models mentioning the subject brand in this snapshot.",
            accent="magenta",
        ),
    ]

    subject_name = subject_row.get("name") if subject_row else "You"
    competitor_candidates = [row for row in brand_rows if not row.get("is_subject")]
    competitor_bars = [
        CompetitorBar(
            name=str(subject_name),
            geo=_geo_score(subject_mentions, total_mentions),
            citations=_percentage(subject_citations, total_citations),
        )
    ]
    for row in competitor_candidates[:3]:
        competitor_bars.append(
            CompetitorBar(
                name=str(row.get("name") or "Unknown"),
                geo=_geo_score(int(row.get("mention_count") or 0), total_mentions),
                citations=_percentage(int(row.get("citation_edge_count") or 0), total_citations),
            )
        )

    top_gap = topic_gap_rows[0] if topic_gap_rows else None
    top_outreach = outreach_rows[0] if outreach_rows else None
    top_competitor = competitor_diff_rows[0] if competitor_diff_rows else None
    quick_insights = [
        QuickInsight(
            title="Topic gaps",
            detail=(
                f"{top_gap['topic']} shows up across {top_gap['source_breadth']} cited sources "
                f"and {top_gap['competitor_breadth']} competitors while the subject has no "
                "brand-topic association yet."
            )
            if top_gap
            else "No under-represented topics surfaced in this analysis snapshot yet."
        ),
        QuickInsight(
            title="Highest-leverage source",
            detail=(
                f"{top_outreach.get('domain') or top_outreach.get('url')} is cited in "
                f"{top_outreach['centrality']} model responses without mentioning the subject brand."
            )
            if top_outreach
            else "No outreach target surfaced because every cited source already mentions the subject."
        ),
        QuickInsight(
            title="Competitor pressure",
            detail=(
                f"{top_competitor['competitor']} outranks the subject in "
                f"{top_competitor['times_ranked_above']} model responses."
            )
            if top_competitor
            else "No competitor ranked above the subject in the captured responses."
        ),
    ]

    return DashboardPayload(
        kpiCards=kpi_cards,
        visibilityTrend=[],
        citationsByModel=[
            CitationByModel(model=str(row.get("model") or "unknown"), count=int(row.get("count") or 0))
            for row in citations_by_model_rows
        ],
        competitorBars=competitor_bars,
        quickInsights=quick_insights,
        provenance={
            "analysis_totals": ANALYSIS_TOTALS_CYPHER.strip(),
            "brand_metrics": BRAND_METRICS_CYPHER.strip(),
            "citations_by_model": CITATIONS_BY_MODEL_CYPHER.strip(),
            "topic_gap": TOPIC_GAP_CYPHER.strip(),
            "outreach": OUTREACH_CYPHER.strip(),
            "competitor_diff": COMPETITOR_DIFF_CYPHER.strip(),
        },
    )
