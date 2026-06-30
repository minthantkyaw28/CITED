"""Recommendation entry point. Runs Stage 6 lazily, caches on state."""
from app import neo4j_client, page_cache, state
from app.stages import recommend


ANALYSIS_EXISTS_CYPHER = """
MATCH (a:Analysis {id: $aid})
RETURN count(a) AS count
"""


async def generate(analysis_id: str) -> dict:
    a = state.get(analysis_id)
    if a and a.get("recommendations"):
        return a["recommendations"]

    if a is None:
        rows = await neo4j_client.run_read(ANALYSIS_EXISTS_CYPHER, {"aid": analysis_id})
        exists = bool(rows and int(rows[0].get("count") or 0) > 0)
        if not exists:
            return {"error": "unknown analysis"}

    page = page_cache.get_page(analysis_id)
    recs = await recommend.generate(analysis_id, page_extract=page)
    if a is not None:
        state.set_recommendations(analysis_id, recs)
    return recs
# chore: note 2026-06-30T11:49:20
