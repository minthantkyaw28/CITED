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


def _close_stacks(text: str) -> str | None:
    """Given a JSON prefix, close any open string + balance braces/brackets.
    Returns a candidate JSON string, or None if it can't be made to scan.
    """
    in_string = False
    escape = False
    stack: list[str] = []
    for ch in text:
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if in_string:
            if ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            stack.append("}")
        elif ch == "[":
            stack.append("]")
        elif ch in "}]":
            if stack and stack[-1] == ch:
                stack.pop()
    out = text
    if in_string:
        out += '"'
    while stack:
        out += stack.pop()
    return out


def _repair_candidates(text: str) -> list[str]:
    """Yield progressive repair candidates for a truncated JSON blob.
    Walks back from the end at structural breakpoints (`,`, `:` boundaries),
    trying to close each prefix into valid JSON.
    """
    s = text.strip()
    candidates: list[str] = [_close_stacks(s)]

    # Walk back: drop everything after the last comma, then close.
    for i in range(len(s) - 1, -1, -1):
        if s[i] == ",":
            prefix = s[:i].rstrip()
            closed = _close_stacks(prefix)
            if closed and closed not in candidates:
                candidates.append(closed)
                if len(candidates) >= 8:
                    break

    # Last resort: drop everything after the last `:` (entire value)
    last_colon = s.rfind(":")
    if last_colon >= 0:
        # Need to keep the value-less key in a valid object — so drop the
        # key/value pair entirely back to the comma or opening brace.
        cut = max(s.rfind(",", 0, last_colon), s.rfind("{", 0, last_colon))
        if cut >= 0:
            prefix = s[: cut].rstrip()
            # Trim a trailing comma if present
            prefix = prefix.rstrip(",")
            closed = _close_stacks(prefix)
            if closed and closed not in candidates:
                candidates.append(closed)

    return [c for c in candidates if c]


def _candidates(text: str) -> list[str]:
    out: list[str] = []
    out.extend(m.group(1) for m in _FENCE.finditer(text))
    m = _OBJECT.search(text)
    if m:
        out.append(m.group(1))
    out.append(text)
    # Repair attempts for truncated JSON
    for repaired in _repair_candidates(text):
        if repaired not in out:
            out.append(repaired)
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
# chore: note 2026-06-19T12:53:08
