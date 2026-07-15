import asyncio
import json
import time
from typing import Any, AsyncIterator


class EventBus:
    """Per-analysis event bus. Multiple subscribers, replay of past events for late subscribers."""

    def __init__(self) -> None:
        self._history: list[dict[str, Any]] = []
        self._subscribers: list[asyncio.Queue[dict[str, Any] | None]] = []
        self._closed = False

    def publish(self, event: dict[str, Any]) -> None:
        event = {"ts": time.time(), **event}
        self._history.append(event)
        for q in list(self._subscribers):
            q.put_nowait(event)

    def close(self) -> None:
        self._closed = True
        for q in list(self._subscribers):
            q.put_nowait(None)

    async def subscribe(self) -> AsyncIterator[str]:
        q: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
        for ev in self._history:
            q.put_nowait(ev)
        if self._closed:
            q.put_nowait(None)
        self._subscribers.append(q)
        try:
            while True:
                ev = await q.get()
                if ev is None:
                    return
                yield f"data: {json.dumps(ev)}\n\n"
        finally:
            if q in self._subscribers:
                self._subscribers.remove(q)


class EventBusRegistry:
    def __init__(self) -> None:
        self._buses: dict[str, EventBus] = {}

    def get_or_create(self, analysis_id: str) -> EventBus:
        if analysis_id not in self._buses:
            self._buses[analysis_id] = EventBus()
        return self._buses[analysis_id]

    def get(self, analysis_id: str) -> EventBus | None:
        return self._buses.get(analysis_id)


registry = EventBusRegistry()
