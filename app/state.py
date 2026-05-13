from typing import Literal

Status = Literal["pending", "discovering", "querying", "building_graph", "analyzing", "done", "failed"]

# In-memory store of analyses (status + recommendation cache).
# Neo4j is the durable graph; this is just request-scoped progress tracking.
_analyses: dict[str, dict] = {}


def create(analysis_id: str, url: str) -> dict:
    _analyses[analysis_id] = {
        "id": analysis_id,
        "url": url,
        "status": "pending",
        "error": None,
        "recommendations": None,
    }
    return _analyses[analysis_id]


def get(analysis_id: str) -> dict | None:
    return _analyses.get(analysis_id)


def set_status(analysis_id: str, status: Status, error: str | None = None) -> None:
    a = _analyses.get(analysis_id)
    if a is None:
        return
    a["status"] = status
    if error:
        a["error"] = error


def set_recommendations(analysis_id: str, recs: dict) -> None:
    a = _analyses.get(analysis_id)
    if a is None:
        return
    a["recommendations"] = recs


def resurrect(analysis_id: str, url: str = "") -> dict:
    """Restore in-memory analysis row from Neo4j after API restart (recommendations still lazy unless warmed)."""
    if analysis_id in _analyses:
        return _analyses[analysis_id]
    _analyses[analysis_id] = {
        "id": analysis_id,
        "url": url,
        "status": "done",
        "error": None,
        "recommendations": None,
    }
    return _analyses[analysis_id]
