import logging
from typing import Any

from openai import AsyncOpenAI

from app import cache
from app.config import settings

log = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None
_models_cache: list[str] | None = None

# Models the gateway advertises but that have no live provider behind them.
# Listed in /v1/models, but return 400 "no registered providers found" on /chat.
# Override at runtime via env: KIMCHI_MODEL_DENYLIST="a,b,c"
import os as _os
_DENYLIST_DEFAULT = {"smollm2-135m", "smollm2-360m"}
_DENYLIST = {
    *_DENYLIST_DEFAULT,
    *(m.strip() for m in _os.getenv("KIMCHI_MODEL_DENYLIST", "").split(",") if m.strip()),
}

# If set, use this list verbatim instead of /v1/models discovery.
# Useful when the gateway dashboard lists more models than /v1/models exposes,
# or when you want the demo to call exactly N specific models.
_ALLOWLIST = [
    m.strip() for m in _os.getenv("KIMCHI_MODEL_ALLOWLIST", "").split(",") if m.strip()
]

# Models for which to enable the OpenAI `web_search` tool. Only the *-search-*
# IDs reliably accept it; passing tools to other models can cause 400s.
_WEB_SEARCH_DEFAULT = {
    "gpt-5-search-api",
    "gpt-5-search-api-2025-10-14",
    "gpt-4o-search-preview",
    "gpt-4o-search-preview-2025-03-11",
    "gpt-4o-mini-search-preview",
    "gpt-4o-mini-search-preview-2025-03-11",
}
_WEB_SEARCH_MODELS = {
    *_WEB_SEARCH_DEFAULT,
    *(m.strip() for m in _os.getenv("KIMCHI_WEB_SEARCH_MODELS", "").split(",") if m.strip()),
}


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url=settings.KIMCHI_BASE_URL or None,
            api_key=settings.KIMCHI_API_KEY or "missing",
        )
    return _client


async def list_models() -> list[str]:
    global _models_cache
    if _models_cache is not None:
        return _models_cache
    if _ALLOWLIST:
        log.info("kimchi using ALLOWLIST (%d models): %s", len(_ALLOWLIST), _ALLOWLIST)
        _models_cache = list(_ALLOWLIST)
        return _models_cache
    try:
        client = get_client()
        resp = await client.models.list()
        raw = [m.id for m in resp.data]
        filtered = [m for m in raw if m not in _DENYLIST]
        dropped = [m for m in raw if m in _DENYLIST]
        if dropped:
            log.info("kimchi denylist filtered %d models: %s", len(dropped), dropped)
        _models_cache = filtered
    except Exception as e:  # noqa: BLE001
        log.warning("kimchi list_models failed: %s", e)
        _models_cache = []
    return _models_cache


async def chat(
    model: str,
    messages: list[dict[str, str]],
    *,
    json_mode: bool = False,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    cached = await cache.get(model, messages, json_mode)
    if cached is not None:
        return cached

    client = get_client()
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    if model in _WEB_SEARCH_MODELS:
        # OpenAI's web-search-preview tool. Only enable on search-capable models;
        # other models 400 on unknown tools.
        kwargs["tools"] = [{"type": "web_search_preview"}]
        kwargs["tool_choice"] = "auto"
    resp = await client.chat.completions.create(**kwargs)
    text = resp.choices[0].message.content or ""
    await cache.put(model, messages, json_mode, text)
    return text


async def healthcheck() -> bool:
    try:
        models = await list_models()
        return len(models) > 0
    except Exception as e:  # noqa: BLE001
        log.warning("kimchi healthcheck failed: %s", e)
        return False
