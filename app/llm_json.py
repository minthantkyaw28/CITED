"""Strict JSON extraction from LLM output.
Kimchi JSON mode is best-effort across models; we defend with regex fallback.
"""
import json
import re
from typing import TypeVar

from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)

_FENCE = re.compile(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", re.DOTALL)
_OBJECT = re.compile(r"(\{.*\}|\[.*\])", re.DOTALL)


def _candidates(text: str) -> list[str]:
    out: list[str] = []
    out.extend(m.group(1) for m in _FENCE.finditer(text))
    m = _OBJECT.search(text)
    if m:
        out.append(m.group(1))
    out.append(text)
    return out


def parse_into(text: str, model_cls: type[T]) -> T:
    last_err: Exception | None = None
    for cand in _candidates(text):
        try:
            data = json.loads(cand)
        except json.JSONDecodeError as e:
            last_err = e
            continue
        try:
            return model_cls.model_validate(data)
        except ValidationError as e:
            last_err = e
            continue
    raise ValueError(f"could not parse LLM output into {model_cls.__name__}: {last_err}\n---\n{text[:400]}")
