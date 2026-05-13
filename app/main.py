import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sse_starlette.sse import EventSourceResponse

from app import graph_queries, kimchi_client, neo4j_client, pipeline, recommendations, state
from app.events import registry
from app.logging_setup import setup_logging
from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    CompetitorsPayload,
    DashboardPayload,
    StatusResponse,
)
from app.stages import competitors, dashboard

setup_logging()
log = logging.getLogger("cited")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("startup: ensuring neo4j constraints")
    try:
        await neo4j_client.ensure_constraints()
    except Exception as e:  # noqa: BLE001
        log.warning("neo4j setup skipped: %s", e)
    try:
        models = await kimchi_client.list_models()
        log.info("kimchi models available: %d", len(models))
    except Exception as e:  # noqa: BLE001
        log.warning("kimchi unavailable at startup: %s", e)
    yield
    await neo4j_client.close_driver()


app = FastAPI(title="Cited", lifespan=lifespan)

# CORS: hackathon defaults. Override with ALLOWED_ORIGINS=comma,separated,urls in prod.
_origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
_allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,  # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/healthz")
async def healthz() -> dict:
    neo_ok = await neo4j_client.healthcheck()
    kimchi_ok = await kimchi_client.healthcheck()
    return {"ok": neo_ok and kimchi_ok, "neo4j": neo_ok, "kimchi": kimchi_ok}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, background: BackgroundTasks) -> AnalyzeResponse:
    analysis_id = uuid.uuid4().hex[:12]
    state.create(analysis_id, str(req.url))
    registry.get_or_create(analysis_id)  # pre-create so the SSE subscriber doesn't miss early events
    background.add_task(_run_pipeline, analysis_id, str(req.url))
    return AnalyzeResponse(analysis_id=analysis_id)


async def _run_pipeline(analysis_id: str, url: str) -> None:
    try:
        await pipeline.run(analysis_id, url)
    except Exception:  # noqa: BLE001
        log.exception("background pipeline crashed")


@app.get("/analyze/{aid}/status", response_model=StatusResponse)
async def status(aid: str) -> StatusResponse:
    a = state.get(aid)
    if not a:
        raise HTTPException(404, "unknown analysis")
    return StatusResponse(**a)


@app.get("/analyze/{aid}/stream")
async def stream(aid: str):
    bus = registry.get(aid)
    if bus is None:
        raise HTTPException(404, "unknown analysis")

    async def gen():
        async for chunk in bus.subscribe():
            # sse_starlette wraps in `data:` itself when given a dict/string;
            # bus already produces SSE-formatted strings, so strip and yield text.
            text = chunk[len("data: "):-len("\n\n")] if chunk.startswith("data: ") else chunk
            yield {"data": text}
            await asyncio.sleep(0)  # let other tasks run

    return EventSourceResponse(gen())


@app.get("/analyze/{aid}/graph")
async def graph(aid: str) -> JSONResponse:
    a = state.get(aid)
    if not a:
        raise HTTPException(404, "unknown analysis")
    return JSONResponse(await graph_queries.fetch_graph(aid))


@app.get("/analyze/{aid}/dashboard", response_model=DashboardPayload)
async def dashboard_view(aid: str) -> DashboardPayload:
    a = state.get(aid)
    if not a:
        raise HTTPException(404, "unknown analysis")
    return await dashboard.fetch(aid)


@app.get("/analyze/{aid}/competitors", response_model=CompetitorsPayload)
async def competitors_view(aid: str) -> CompetitorsPayload:
    a = state.get(aid)
    if not a:
        raise HTTPException(404, "unknown analysis")
    return await competitors.fetch(aid)


@app.get("/analyze/{aid}/recommendations")
async def recs(aid: str) -> JSONResponse:
    a = state.get(aid)
    if not a:
        raise HTTPException(404, "unknown analysis")
    return JSONResponse(await recommendations.generate(aid))
