"""Stage 1 — Discover.
Fetch a landing page, pull title/H1/hero/meta + visible text, send to a fast
Kimchi model, parse into BrandProfile.
"""
import logging
import re

import httpx
from selectolax.parser import HTMLParser

from app import kimchi_client
from app.config import settings
from app.llm_json import parse_into
from app.models import BrandProfile

log = logging.getLogger(__name__)

MAX_TEXT_CHARS = 16_000  # ~4k tokens


def _clean(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s).strip()


def extract_page(html: str) -> dict[str, str]:
    tree = HTMLParser(html)

    title = ""
    if tree.css_first("title"):
        title = _clean(tree.css_first("title").text())

    meta_desc = ""
    for sel in ['meta[name="description"]', 'meta[property="og:description"]']:
        n = tree.css_first(sel)
        if n:
            meta_desc = _clean(n.attributes.get("content"))
            if meta_desc:
                break

    h1 = ""
    n = tree.css_first("h1")
    if n:
        h1 = _clean(n.text())

    # Strip noisy nodes before pulling visible text
    for sel in ("script", "style", "noscript", "svg", "header", "footer", "nav"):
        for n in tree.css(sel):
            n.decompose()

    visible = _clean(tree.body.text(separator=" ")) if tree.body else ""
    visible = visible[:MAX_TEXT_CHARS]

    return {"title": title, "h1": h1, "meta_description": meta_desc, "visible_text": visible}


async def fetch(url: str) -> str:
    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=20.0,
        headers={"User-Agent": "Mozilla/5.0 (compatible; CitedBot/0.1)"},
    ) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.text


DISCOVER_SYSTEM = (
    "You are an analyst. Given a landing page extract, infer the brand, "
    "its category, positioning, and likely competitors. Respond as STRICT JSON only, "
    "matching this schema exactly:\n"
    '{"brand_name": str, "category": str, "positioning": str, "candidate_competitors": [str, ...]}'
)


def _user_prompt(url: str, page: dict[str, str]) -> str:
    return (
        f"URL: {url}\n"
        f"TITLE: {page['title']}\n"
        f"H1: {page['h1']}\n"
        f"META: {page['meta_description']}\n"
        f"VISIBLE_TEXT:\n{page['visible_text']}\n\n"
        "Return JSON only."
    )


async def run(url: str) -> tuple[BrandProfile, dict[str, str]]:
    html = await fetch(url)
    page = extract_page(html)

    raw = await kimchi_client.chat(
        model=settings.KIMCHI_FAST_MODEL,
        messages=[
            {"role": "system", "content": DISCOVER_SYSTEM},
            {"role": "user", "content": _user_prompt(url, page)},
        ],
        json_mode=True,
        temperature=0.2,
        max_tokens=600,
    )
    profile = parse_into(raw, BrandProfile)
    log.info("discover: brand=%s category=%s", profile.brand_name, profile.category)
    return profile, page
