import logging
from typing import Any

from neo4j import AsyncDriver, AsyncGraphDatabase

from app.config import settings

log = logging.getLogger(__name__)

_driver: AsyncDriver | None = None


async def get_driver() -> AsyncDriver | None:
    global _driver
    if _driver is None and settings.NEO4J_URI:
        _driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
    return _driver


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


CONSTRAINTS = [
    "CREATE CONSTRAINT brand_url IF NOT EXISTS FOR (b:Brand) REQUIRE b.url IS UNIQUE",
    "CREATE CONSTRAINT source_url IF NOT EXISTS FOR (s:Source) REQUIRE s.url IS UNIQUE",
    "CREATE CONSTRAINT query_text IF NOT EXISTS FOR (q:Query) REQUIRE q.text IS UNIQUE",
    "CREATE CONSTRAINT analysis_id IF NOT EXISTS FOR (a:Analysis) REQUIRE a.id IS UNIQUE",
    "CREATE CONSTRAINT topic_name IF NOT EXISTS FOR (t:Topic) REQUIRE t.name IS UNIQUE",
]


async def ensure_constraints() -> None:
    driver = await get_driver()
    if driver is None:
        log.warning("neo4j not configured, skipping constraints")
        return
    async with driver.session() as session:
        for c in CONSTRAINTS:
            await session.run(c)
    log.info("neo4j constraints ensured")


async def run_write(cypher: str, params: dict[str, Any] | None = None) -> None:
    driver = await get_driver()
    if driver is None:
        return
    try:
        async with driver.session() as session:
            await session.run(cypher, params or {})
    except Exception as e:  # noqa: BLE001
        log.warning("neo4j write failed: %s", e)


async def run_read(cypher: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    driver = await get_driver()
    if driver is None:
        return []
    try:
        async with driver.session() as session:
            result = await session.run(cypher, params or {})
            records = [r.data() async for r in result]
        return records
    except Exception as e:  # noqa: BLE001
        # Degrade gracefully: if Neo4j is unreachable or the query errors,
        # log and return an empty result. Endpoints render empty state.
        log.warning("neo4j read failed: %s", e)
        return []


async def healthcheck() -> bool:
    try:
        rows = await run_read("RETURN 1 AS ok")
        return bool(rows and rows[0].get("ok") == 1)
    except Exception as e:  # noqa: BLE001
        log.warning("neo4j healthcheck failed: %s", e)
        return False


async def fetch_analysis_root_url(analysis_id: str) -> str | None:
    """Return root URL if an Analysis node exists; None if graph has no such analysis."""
    rows = await run_read(
        "MATCH (a:Analysis {id: $aid}) RETURN coalesce(a.root_url, '') AS url LIMIT 1",
        {"aid": analysis_id},
    )
    if not rows:
        return None
    url = rows[0].get("url")
    return str(url) if url is not None else ""
