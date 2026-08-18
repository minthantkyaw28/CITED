"""Pipeline orchestrator.

Stage flow:
  1. discover  — fetch URL, infer brand profile
  2. plan      — generate buyer-intent queries
  3. query     — fan out (query × model) across Kimchi
  4. extract   — structured parse of each response (inline in stage 3)
  5. write     — bulk write to Neo4j

Stage 6 (recommendations) runs lazily when /recommendations is hit.

Failures inside any stage are logged and swallowed where safe; setup failures
(no Kimchi, no Neo4j) abort the run with status=failed.
"""
import logging

from app import kimchi_client, state
from app.events import registry
from app.page_cache import remember_page
from app.stages import discover, plan, query_fanout, write_graph

log = logging.getLogger(__name__)


async def run(analysis_id: str, url: str) -> None:
    bus = registry.get_or_create(analysis_id)
    try:
        bus.publish({"stage": "starting", "url": url, "analysis_id": analysis_id})

        # --- Stage 1: Discover ---
        state.set_status(analysis_id, "discovering")
        bus.publish({"stage": "discovering", "msg": "fetching page + inferring brand"})
        try:
            profile, page = await discover.run(url)
        except Exception as e:  # noqa: BLE001
            log.exception("discover failed")
            state.set_status(analysis_id, "failed", error=f"discover: {e}")
            bus.publish({"stage": "failed", "where": "discover", "error": str(e)})
            return
        remember_page(analysis_id, page)
        bus.publish({
            "stage": "discovering",
            "msg": "brand inferred",
            "brand": profile.brand_name,
            "category": profile.category,
            "competitors": profile.candidate_competitors,
        })

        # --- Stage 2: Plan ---
        bus.publish({"stage": "planning", "msg": "generating buyer-intent queries"})
        try:
            plan_result = await plan.run(profile)
        except Exception as e:  # noqa: BLE001
            log.exception("plan failed")
            state.set_status(analysis_id, "failed", error=f"plan: {e}")
            bus.publish({"stage": "failed", "where": "plan", "error": str(e)})
            return
        bus.publish({"stage": "planning", "msg": f"planned {len(plan_result.queries)} queries", "n": len(plan_result.queries)})

        # --- Stage 3 + 4: Query + Extract ---
        state.set_status(analysis_id, "querying")
        models = await kimchi_client.list_models()
        if not models:
            bus.publish({"stage": "querying", "msg": "no Kimchi models discovered — using fast model only"})
            from app.config import settings
            models = [settings.KIMCHI_FAST_MODEL]
        bus.publish({"stage": "querying", "msg": f"available models: {len(models)}", "models": models})
        calls = await query_fanout.run(plan_result.queries, models, bus)

        # --- Stage 5: Write ---
        state.set_status(analysis_id, "building_graph")
        bus.publish({"stage": "building_graph", "msg": f"writing {len(calls)} responses to neo4j"})
        try:
            queries_for_write = [{"text": q.text, "intent": q.intent} for q in plan_result.queries]
            await write_graph.run(analysis_id, url, profile, queries_for_write, calls)
        except Exception as e:  # noqa: BLE001
            log.exception("write_graph failed")
            state.set_status(analysis_id, "failed", error=f"write_graph: {e}")
            bus.publish({"stage": "failed", "where": "write_graph", "error": str(e)})
            return
        bus.publish({"stage": "building_graph", "msg": "graph write complete"})

        state.set_status(analysis_id, "done")
        bus.publish({"stage": "done", "msg": "analysis complete", "responses": len(calls)})
    except Exception as e:  # noqa: BLE001
        log.exception("pipeline crashed")
        state.set_status(analysis_id, "failed", error=str(e))
        bus.publish({"stage": "failed", "error": str(e)})
    finally:
        bus.close()
# chore: note 2026-08-18T09:43:51
