import logging
from typing import Any

from openai import AsyncOpenAI

from app import cache
from app.config import settings

log = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None
_models_cache: list[str] | None = None


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
    try:
        client = get_client()
        resp = await client.models.list()
        _models_cache = [m.id for m in resp.data]
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
