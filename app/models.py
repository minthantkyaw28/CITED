from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class AnalyzeRequest(BaseModel):
    url: HttpUrl


class AnalyzeResponse(BaseModel):
    analysis_id: str


class StatusResponse(BaseModel):
    id: str
    url: str
    status: str
    error: str | None = None


# Stage 1 — Discover
class BrandProfile(BaseModel):
    brand_name: str
    category: str
    positioning: str
    candidate_competitors: list[str] = Field(default_factory=list)


# Stage 2 — Plan
class PlannedQuery(BaseModel):
    text: str
    intent: str  # comparison | best_of | alternatives | use_case | feature


class QueryPlan(BaseModel):
    queries: list[PlannedQuery]


# Stage 4 — Extract
class MentionedBrand(BaseModel):
    name: str
    rank: int = 0
    sentiment: str = "neutral"


class CitedSource(BaseModel):
    url: str
    title: str | None = None


class ExtractedResponse(BaseModel):
    mentioned_brands: list[MentionedBrand] = Field(default_factory=list)
    cited_sources: list[CitedSource] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)


# Read-side payloads
class KpiCard(BaseModel):
    id: str
    title: str
    value: float | None = None
    delta: str | None = None
    hint: str
    accent: str


class VisibilityTrendPoint(BaseModel):
    week: str
    cited: float
    modeled: float


class CitationByModel(BaseModel):
    model: str
    count: int


class CompetitorBar(BaseModel):
    name: str
    geo: float | None = None
    citations: float | None = None


class QuickInsight(BaseModel):
    title: str
    detail: str


class DashboardPayload(BaseModel):
    kpiCards: list[KpiCard] = Field(default_factory=list)
    visibilityTrend: list[VisibilityTrendPoint] = Field(default_factory=list)
    citationsByModel: list[CitationByModel] = Field(default_factory=list)
    competitorBars: list[CompetitorBar] = Field(default_factory=list)
    quickInsights: list[QuickInsight] = Field(default_factory=list)
    provenance: dict[str, str] = Field(default_factory=dict)


class CompetitorRow(BaseModel):
    name: str
    isYou: bool = False
    geoScore: float | None = None
    aiMentions: int
    citationFrequency: float | None = None
    semanticClarity: float | None = None
    aiReadability: float | None = None


class CompetitorInsight(BaseModel):
    leader: str
    summary: str


class CompetitorsPayload(BaseModel):
    rows: list[CompetitorRow] = Field(default_factory=list)
    insight: CompetitorInsight
    provenance: dict[str, Any] = Field(default_factory=dict)
