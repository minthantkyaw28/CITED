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
    # Cache hit — but only return cached non-empty responses; treat empty as a miss.
    cached = await cache.get(model, messages, json_mode)
    if cached:
        return cached

    client = get_client()
    is_reasoning = _is_reasoning_model(model)
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": messages,
    }
    # Reasoning models (gpt-5*, o1*, o3*, o4*) burn the `max_tokens` budget on
    # hidden reasoning tokens FIRST. With a small cap (e.g. 600) they often
    # exhaust the budget before emitting any visible content and return "".
    # OpenAI's fix is `max_completion_tokens` (only caps visible output) plus
    # a much larger budget. Reasoning models also reject custom `temperature`.
    if is_reasoning:
        kwargs["max_completion_tokens"] = max(max_tokens * 4, 4000)
    else:
        kwargs["max_tokens"] = max_tokens
        kwargs["temperature"] = temperature
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    if model in _WEB_SEARCH_MODELS:
        # OpenAI's web-search-preview tool. Only enable on search-capable models;
        # other models 400 on unknown tools.
        kwargs["tools"] = [{"type": "web_search_preview"}]
        kwargs["tool_choice"] = "auto"

    # One-shot retry if the model returns an empty body (intermittent on
    # certain prompts via the Kimchi gateway). Same model, same kwargs.
    text = ""
    finish = "?"
    for attempt in (1, 2):
        resp = await client.chat.completions.create(**kwargs)
        text = (resp.choices[0].message.content or "") if resp.choices else ""
        finish = resp.choices[0].finish_reason if resp.choices else "?"
        if text.strip():
            break
        log.warning(
            "kimchi empty content: model=%s finish_reason=%s attempt=%d",
            model, finish, attempt,
        )

    # Only cache non-empty results — don't pollute the cache with flake.
    if text.strip():
        await cache.put(model, messages, json_mode, text)
    return text


def _is_reasoning_model(model: str) -> bool:
    """gpt-5*, o1*, o3*, o4* are reasoning models — different token semantics."""
    m = model.lower()
    if m.startswith(("o1", "o3", "o4")):
        return True
    if m.startswith("gpt-5"):
        # gpt-5-chat-latest is NOT a reasoning model; everything else gpt-5* is.
        return not m.startswith("gpt-5-chat")
    return False


async def healthcheck() -> bool:
    try:
        models = await list_models()
        return len(models) > 0
    except Exception as e:  # noqa: BLE001
        log.warning("kimchi healthcheck failed: %s", e)
        return False
