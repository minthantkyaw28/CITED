"""Stage 2 — Plan.
One LLM call to generate a diverse spread of buyer-intent queries across
intent types. Soft floor/ceiling enforced after.
"""
import logging

from app import kimchi_client
from app.config import settings
from app.llm_json import parse_into
from app.models import BrandProfile, QueryPlan

log = logging.getLogger(__name__)

SOFT_FLOOR = 12
SOFT_CEILING = 40

PLAN_SYSTEM = (
    "You generate buyer-intent search queries someone would ask an LLM "
    "before choosing a product in a category. Cover ALL of these intent types broadly:\n"
    "  comparison    — 'X vs Y'\n"
    "  best_of       — 'best X for Y'\n"
    "  alternatives  — 'alternatives to X'\n"
    "  use_case      — 'how to do Y using a tool like X'\n"
    "  feature       — 'X with feature Z'\n"
    "Aim for breadth across the whole category, not narrow variations of the same question. "
    "Pick the count yourself based on the category's natural breadth. "
    "Respond as STRICT JSON only:\n"
    '{"queries": [{"text": str, "intent": str}, ...]}'
)


def _user_prompt(profile: BrandProfile) -> str:
    return (
        f"Brand: {profile.brand_name}\n"
        f"Category: {profile.category}\n"
        f"Positioning: {profile.positioning}\n"
        f"Likely competitors: {', '.join(profile.candidate_competitors) or '(unknown)'}\n\n"
        "Return JSON only."
    )


async def run(profile: BrandProfile) -> QueryPlan:
    raw = await kimchi_client.chat(
        model=settings.KIMCHI_FAST_MODEL,
        messages=[
            {"role": "system", "content": PLAN_SYSTEM},
            {"role": "user", "content": _user_prompt(profile)},
        ],
        json_mode=True,
        temperature=0.6,
        max_tokens=2000,
    )
    plan = parse_into(raw, QueryPlan)

    # Dedupe (case-insensitive) and clip to soft bounds
    seen: set[str] = set()
    deduped = []
    for q in plan.queries:
        key = q.text.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(q)
    if len(deduped) > SOFT_CEILING:
        deduped = deduped[:SOFT_CEILING]
    plan.queries = deduped

    if len(plan.queries) < SOFT_FLOOR:
        log.warning("plan: only %d queries (floor=%d) — proceeding anyway", len(plan.queries), SOFT_FLOOR)
    log.info("plan: %d queries planned", len(plan.queries))
    return plan
