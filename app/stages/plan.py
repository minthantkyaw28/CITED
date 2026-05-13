"""Stage 2 — Plan.
One LLM call to generate a diverse spread of buyer-intent queries across
intent types. Soft floor/ceiling enforced after.
"""
import logging
import re

from app import kimchi_client
from app.config import settings
from app.llm_json import parse_into
from app.models import BrandProfile, PlannedQuery, QueryPlan

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


def _slug(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    return cleaned or "AI software"


def _fallback_queries(profile: BrandProfile) -> list[PlannedQuery]:
    category = _slug(profile.category)
    brand = _slug(profile.brand_name)
    competitors = [_slug(name) for name in profile.candidate_competitors if name.strip()]
    first_competitor = competitors[0] if competitors else "top competitors"
    second_competitor = competitors[1] if len(competitors) > 1 else "enterprise alternatives"

    seeds = [
        ("comparison", f"{brand} vs {first_competitor}"),
        ("comparison", f"{brand} vs {second_competitor}"),
        ("best_of", f"best {category}"),
        ("best_of", f"best {category} for enterprise teams"),
        ("best_of", f"best {category} for startups"),
        ("alternatives", f"alternatives to {brand}"),
        ("alternatives", f"{brand} competitors"),
        ("use_case", f"how to choose a {category}"),
        ("use_case", f"{category} for AI teams"),
        ("use_case", f"{category} for developer workflows"),
        ("feature", f"{category} with citation tracking"),
        ("feature", f"{category} with competitor analysis"),
    ]
    return [PlannedQuery(text=text, intent=intent) for intent, text in seeds]


async def run(profile: BrandProfile) -> QueryPlan:
    messages = [
        {"role": "system", "content": PLAN_SYSTEM},
        {"role": "user", "content": _user_prompt(profile)},
    ]
    available = await kimchi_client.list_models()
    primary = settings.KIMCHI_FAST_MODEL
    ordered: list[str] = [primary] + [m for m in available if m != primary]

    plan: QueryPlan | None = None
    last_err: Exception | None = None
    for model in ordered[:4]:
        try:
            raw = await kimchi_client.chat(
                model=model,
                messages=messages,
                json_mode=True,
                temperature=0.6,
                max_tokens=2000,
            )
            if not raw.strip():
                log.warning("plan: empty response from model=%s", model)
                continue
            plan = parse_into(raw, QueryPlan)
            log.info("plan: parsed model=%s", model)
            break
        except Exception as e:  # noqa: BLE001
            log.warning("plan: model=%s failed: %s", model, e)
            last_err = e
            continue

    if plan is None:
        raise RuntimeError(f"plan failed across {len(ordered[:4])} models: {last_err}")

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
        fallback = _fallback_queries(profile)
        existing = {q.text.strip().lower() for q in plan.queries if q.text.strip()}
        for q in fallback:
            key = q.text.strip().lower()
            if key and key not in existing:
                plan.queries.append(q)
                existing.add(key)
            if len(plan.queries) >= SOFT_FLOOR:
                break
        log.warning(
            "plan: only %d LLM queries (floor=%d) — augmented with deterministic fallback to %d",
            len(deduped),
            SOFT_FLOOR,
            len(plan.queries),
        )
    log.info("plan: %d queries planned", len(plan.queries))
    return plan
