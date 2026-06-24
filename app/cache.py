"""Tiny SQLite-backed LLM response cache, keyed by (model, prompt_hash).
Re-running the same analysis URL twice in dev is near-instant after the first run.
"""
import asyncio
import hashlib
import json
import sqlite3
from pathlib import Path

_DB_PATH = Path(__file__).parent.parent / "cache.sqlite"
_lock = asyncio.Lock()


def _conn() -> sqlite3.Connection:
    c = sqlite3.connect(_DB_PATH)
    c.execute("CREATE TABLE IF NOT EXISTS llm_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    return c


def _key(model: str, messages: list[dict], json_mode: bool) -> str:
    payload = json.dumps({"m": model, "msgs": messages, "j": json_mode}, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


async def get(model: str, messages: list[dict], json_mode: bool) -> str | None:
    k = _key(model, messages, json_mode)
    async with _lock:
        c = _conn()
        try:
            row = c.execute("SELECT value FROM llm_cache WHERE key=?", (k,)).fetchone()
        finally:
            c.close()
    return row[0] if row else None


async def put(model: str, messages: list[dict], json_mode: bool, value: str) -> None:
    k = _key(model, messages, json_mode)
    async with _lock:
        c = _conn()
        try:
            c.execute("INSERT OR REPLACE INTO llm_cache (key, value) VALUES (?, ?)", (k, value))
            c.commit()
        finally:
            c.close()
# chore: note 2026-06-24T11:52:19
