"""Stages 3 + 4 — Query and Extract.

Fan every (query, model) across Kimchi in parallel under a semaphore. For each
response, run a cheap structured-extract LLM call to pull mentioned brands,
cited sources, and topics. Individual failures are logged and skipped — the
pipeline never aborts on one bad call.
"""
import asyncio
import logging
from dataclasses import dataclass
from urllib.parse import urlparse, urlunparse

from app import kimchi_client
from app.config import settings
from app.events import EventBus
from app.llm_json import parse_into
from app.models import CitedSource, ExtractedResponse, PlannedQuery

log = logging.getLogger(__name__)


QUERY_SYSTEM = (
    "You are an end user researching products. Answer the user's question "
    "naturally and concretely. Name specific products by brand. When you reference "
    "external information, include the source URL inline in parentheses like (https://example.com/post). "
    "Be opinionated and specific."
)

EXTRACT_SYSTEM = (
    "Parse the assistant's response and return STRICT JSON only matching:\n"
    '{"mentioned_brands": [{"name": str, "rank": int, "sentiment": "positive"|"neutral"|"negative"}], '
    '"cited_sources": [{"url": str, "title": str | null}], '
    '"topics": [str]}\n'
    "Rules:\n"
    "- 'rank' is the order the brand appears (1 = first mentioned).\n"
    "- Only include URLs that appear literally in the response.\n"
    "- 'topics' are 1–4 word noun phrases describing what the response is about."
)


@dataclass
class ModelCall:
    query_text: str
    query_intent: str
    model: str
    response_text: str
    extracted: ExtractedResponse


def _canon_url(url: str) -> str:
    """Strip fragment + query, normalize host casing, drop trailing slash."""
    try:
        p = urlparse(url.strip())
        if not p.scheme or not p.netloc:
            return ""
        netloc = p.netloc.lower()
        path = p.path or "/"
        if path != "/" and path.endswith("/"):
            path = path.rstrip("/")
        return urlunparse((p.scheme.lower(), netloc, path, "", "", ""))
    except Exception:  # noqa: BLE001
        return ""


def _dedupe_sources(sources: list[CitedSource]) -> list[CitedSource]:
    seen: set[str] = set()
    out: list[CitedSource] = []
    for s in sources:
        canon = _canon_url(s.url)
        if not canon or canon in seen:
            continue
        seen.add(canon)
        out.append(CitedSource(url=canon, title=s.title))
    return out


async def _ask_model(query: PlannedQuery, model: str) -> str:
    return await kimchi_client.chat(
        model=model,
        messages=[
            {"role": "system", "content": QUERY_SYSTEM},
            {"role": "user", "content": query.text},
        ],
        json_mode=False,
        temperature=0.7,
        max_tokens=900,
    )


async def _extract(response_text: str) -> ExtractedResponse:
    raw = await kimchi_client.chat(
        model=settings.KIMCHI_EXTRACT_MODEL,
        messages=[
            {"role": "system", "content": EXTRACT_SYSTEM},
            {"role": "user", "content": response_text},
        ],
        json_mode=True,
        temperature=0.0,
        max_tokens=900,
    )
    extracted = parse_into(raw, ExtractedResponse)
    extracted.cited_sources = _dedupe_sources(extracted.cited_sources)
    return extracted


async def _one(
    sem: asyncio.Semaphore,
    query: PlannedQuery,
    model: str,
    idx: int,
    total: int,
    bus: EventBus,
) -> ModelCall | None:
    async with sem:
        bus.publish({"stage": "querying", "model": model, "query_idx": idx, "total": total, "query": query.text})
        try:
            response_text = await _ask_model(query, model)
        except Exception as e:  # noqa: BLE001
            log.warning("query failed model=%s q=%r err=%s", model, query.text, e)
            bus.publish({"stage": "querying", "model": model, "query_idx": idx, "total": total, "error": str(e)})
            return None
        try:
            extracted = await _extract(response_text)
        except Exception as e:  # noqa: BLE001
            log.warning("extract failed model=%s err=%s", model, e)
            bus.publish({"stage": "extracting", "model": model, "query_idx": idx, "error": str(e)})
            return None
        bus.publish({
            "stage": "extracted",
            "model": model,
            "query_idx": idx,
            "brands": len(extracted.mentioned_brands),
            "sources": len(extracted.cited_sources),
        })
        return ModelCall(
            query_text=query.text,
            query_intent=query.intent,
            model=model,
            response_text=response_text,
            extracted=extracted,
        )


async def run(queries: list[PlannedQuery], models: list[str], bus: EventBus) -> list[ModelCall]:
    if not models:
        log.warning("no models available — skipping query stage")
        return []
    pairs = [(q, m) for q in queries for m in models]
    total = len(pairs)
    bus.publish({"stage": "querying", "msg": f"fanning out {total} (query, model) pairs across {len(models)} models"})
    sem = asyncio.Semaphore(settings.QUERY_FANOUT_CONCURRENCY)
    tasks = [
        asyncio.create_task(_one(sem, q, m, i + 1, total, bus))
        for i, (q, m) in enumerate(pairs)
    ]
    results = await asyncio.gather(*tasks)
    calls = [c for c in results if c is not None]
    bus.publish({"stage": "querying", "msg": f"completed {len(calls)}/{total} (query, model) calls"})
    return calls
# chore: note 2026-07-30T15:25:52
