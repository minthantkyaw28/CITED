"""Stage 5 — Write everything to Neo4j.

All writes are idempotent (MERGE everywhere except ModelResponse, which has no
natural key). Schema and Cypher patterns mirror the cypher-for-citation-graphs
Tessl Skill.
"""
import logging
from urllib.parse import urlparse

from neo4j import AsyncDriver

from app import neo4j_client
from app.models import BrandProfile
from app.stages.query_fanout import ModelCall

log = logging.getLogger(__name__)


def _brand_key(name: str, url: str | None = None) -> str:
    if url:
        return url
    return "brand://" + name.strip().lower()


def _mention_brand_url(name: str, profile: BrandProfile, root_url: str) -> str:
    """Align subject mentions with the seeded Brand node (root_url), not brand://slug."""
    if name.strip().lower() == profile.brand_name.strip().lower():
        return _brand_key(profile.brand_name, root_url)
    return _brand_key(name)


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower()
    except Exception:  # noqa: BLE001
        return ""


SEED_CYPHER = """
MERGE (a:Analysis {id: $aid})
ON CREATE SET a.root_url = $root_url, a.started_at = datetime(), a.status = 'querying'
ON MATCH  SET a.status = 'querying'

MERGE (subject:Brand {url: $subject_url})
ON CREATE SET subject.name = $subject_name,
              subject.is_subject = true,
              subject.category = $category,
              subject.positioning = $positioning
ON MATCH  SET subject.is_subject = true,
              subject.category = coalesce(subject.category, $category),
              subject.positioning = coalesce(subject.positioning, $positioning)
MERGE (a)-[:ABOUT]->(subject)

WITH a
UNWIND $queries AS qrow
  MERGE (q:Query {text: qrow.text})
    ON CREATE SET q.intent = qrow.intent
  MERGE (a)-[:RAN]->(q)
"""


RESPONSES_CYPHER = """
MATCH (a:Analysis {id: $aid})
UNWIND $rows AS row
  MATCH (q:Query {text: row.query_text})
  CREATE (mr:ModelResponse {model: row.model, text: row.response_text, captured_at: datetime()})
  MERGE (q)-[:ASKED_TO]->(mr)

  FOREACH (m IN row.mentions |
    MERGE (b:Brand {url: m.url})
      ON CREATE SET b.name = m.name, b.is_subject = false
    MERGE (mr)-[r:MENTIONS]->(b)
      ON CREATE SET r.rank = m.rank, r.sentiment = m.sentiment
  )

  FOREACH (c IN row.citations |
    MERGE (s:Source {url: c.url})
      ON CREATE SET s.title = c.title, s.domain = c.domain, s.type = 'article'
    MERGE (mr)-[:CITES]->(s)
    FOREACH (tname IN row.topics |
      MERGE (t:Topic {name: tname})
      MERGE (s)-[:DISCUSSES]->(t)
    )
  )
"""


COMPETES_CYPHER = """
MATCH (a:Analysis {id: $aid})-[:ABOUT]->(subject:Brand)
MATCH (a)-[:RAN]->(:Query)-[:ASKED_TO]->(mr:ModelResponse)-[:MENTIONS]->(other:Brand)
WHERE other <> subject
WITH subject, other, count(*) AS co
WHERE co >= 2
MERGE (subject)-[:COMPETES_WITH]->(other)
"""


BATCH_SIZE = 25


async def run(
    analysis_id: str,
    url: str,
    profile: BrandProfile,
    queries: list[dict],
    calls: list[ModelCall],
) -> None:
    driver: AsyncDriver | None = await neo4j_client.get_driver()
    if driver is None:
        log.warning("neo4j not configured — skipping write_graph")
        return

    subject_url = _brand_key(profile.brand_name, url)

    async with driver.session() as session:
        await session.run(
            SEED_CYPHER,
            {
                "aid": analysis_id,
                "root_url": url,
                "subject_url": subject_url,
                "subject_name": profile.brand_name,
                "category": profile.category,
                "positioning": profile.positioning,
                "queries": queries,
            },
        )

        rows: list[dict] = []
        for c in calls:
            mentions = [
                {
                    "url": _mention_brand_url(b.name, profile, url),
                    "name": b.name,
                    "rank": b.rank,
                    "sentiment": b.sentiment,
                }
                for b in c.extracted.mentioned_brands
                if b.name and b.name.strip()
            ]
            citations = [
                {"url": s.url, "title": s.title, "domain": _domain(s.url)}
                for s in c.extracted.cited_sources
                if s.url
            ]
            rows.append({
                "query_text": c.query_text,
                "model": c.model,
                "response_text": c.response_text,
                "mentions": mentions,
                "citations": citations,
                "topics": [t for t in c.extracted.topics if t],
            })

        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i : i + BATCH_SIZE]
            await session.run(RESPONSES_CYPHER, {"aid": analysis_id, "rows": batch})

        await session.run(COMPETES_CYPHER, {"aid": analysis_id})

    log.info("write_graph: wrote %d responses for analysis %s", len(calls), analysis_id)
