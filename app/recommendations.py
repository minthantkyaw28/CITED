"""Recommendation entry point. Runs Stage 6 lazily, caches on state."""
from app import page_cache, state
from app.stages import recommend


async def generate(analysis_id: str) -> dict:
    a = state.get(analysis_id)
    if a is None:
        return {"error": "unknown analysis"}
    if a.get("recommendations"):
        return a["recommendations"]
    page = page_cache.get(analysis_id)
    recs = await recommend.generate(analysis_id, page_extract=page)
    state.set_recommendations(analysis_id, recs)
    return recs
