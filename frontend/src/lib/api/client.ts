import type {
  AnalyzeResponse,
  CompetitorsPayload,
  DashboardPayload,
  GraphPayload,
  NeoEdge,
  NeoNode,
  RecommendationPayload,
  StatusResponse,
} from "@/lib/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function humanizeModelName(modelId: string) {
  return modelId
    .replace(/^model:/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function labelFromPrefix(id: string): NeoNode["labels"][number] {
  if (id.startsWith("model:")) return "Model";
  if (id.startsWith("query:")) return "Query";
  if (id.startsWith("brand:")) return "Competitor";
  return "Keyword";
}

function normalizeNode(raw: Record<string, unknown>, subjectId: string | null): NeoNode {
  const id = String(raw.id ?? "");
  const rawLabel = typeof raw.label === "string" ? raw.label : null;

  if (Array.isArray(raw.labels) && raw.properties && typeof raw.properties === "object") {
    return raw as unknown as NeoNode;
  }

  let labels: NeoNode["labels"];
  if (rawLabel === "Brand") {
    labels = [raw.is_subject ? "Brand" : "Competitor"];
  } else if (rawLabel === "Source") {
    labels = ["Keyword"];
  } else if (rawLabel === "Query") {
    labels = ["Query"];
  } else if (rawLabel === "Model") {
    labels = ["Model"];
  } else {
    labels = [labelFromPrefix(id)];
  }

  if (id === subjectId) {
    labels = ["Brand"];
  }

  return {
    id,
    labels,
    properties: {
      name: String(raw.name ?? raw.text ?? raw.title ?? raw.url ?? id),
      subtitle:
        typeof raw.domain === "string"
          ? raw.domain
          : typeof raw.intent === "string"
            ? raw.intent
            : undefined,
    },
  };
}

function synthesizeNode(id: string, subjectId: string | null): NeoNode {
  const label = id === subjectId ? "Brand" : labelFromPrefix(id);
  return {
    id,
    labels: [label],
    properties: {
      name:
        label === "Model"
          ? humanizeModelName(id)
          : id.replace(/^[^:]+:/, "").replace(/[-_]+/g, " "),
    },
  };
}

function normalizeEdge(raw: Record<string, unknown>, index: number): NeoEdge {
  const source = String(raw.source ?? raw.from ?? "");
  const target = String(raw.target ?? raw.to ?? "");
  const type = String(raw.type ?? "MENTIONS") as NeoEdge["type"];
  const rank = typeof raw.rank === "number" ? raw.rank : null;

  return {
    id: String(raw.id ?? `${type}:${source}:${target}:${index}`),
    source,
    target,
    type,
    strength:
      typeof raw.strength === "number"
        ? raw.strength
        : rank && rank > 0
          ? Number((1 / rank).toFixed(3))
          : 1,
  };
}

function normalizeGraphPayload(raw: Record<string, unknown>, analysisId: string): GraphPayload {
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];
  const subjectNode = rawNodes.find(
    (node) => node && typeof node === "object" && Boolean((node as Record<string, unknown>).is_subject)
  ) as Record<string, unknown> | undefined;
  const subjectId = subjectNode?.id ? String(subjectNode.id) : null;

  const nodeMap = new Map<string, NeoNode>();
  for (const node of rawNodes) {
    if (!node || typeof node !== "object") continue;
    const normalized = normalizeNode(node as Record<string, unknown>, subjectId);
    nodeMap.set(normalized.id, normalized);
  }

  const edges = rawEdges
    .filter((edge): edge is Record<string, unknown> => Boolean(edge && typeof edge === "object"))
    .map((edge, index) => normalizeEdge(edge, index));

  for (const edge of edges) {
    if (!nodeMap.has(edge.source)) nodeMap.set(edge.source, synthesizeNode(edge.source, subjectId));
    if (!nodeMap.has(edge.target)) nodeMap.set(edge.target, synthesizeNode(edge.target, subjectId));
  }

  return {
    analysis_id: String(raw.analysis_id ?? analysisId),
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}

function normalizeRecommendationsPayload(raw: Record<string, unknown>): RecommendationPayload {
  return {
    landing_page_rewrite: (raw.landing_page_rewrite ?? {
      h1_before: "",
      h1_after: "",
      meta_before: "",
      meta_after: "",
      rationale: "",
      target_topics: [],
    }) as RecommendationPayload["landing_page_rewrite"],
    content_gaps: Array.isArray(raw.content_gaps) ? (raw.content_gaps as Array<Record<string, unknown>>) : [],
    outreach_targets: Array.isArray(raw.outreach_targets)
      ? (raw.outreach_targets as Array<Record<string, unknown>>)
      : [],
    subject: (raw.subject ?? {}) as Record<string, unknown>,
    cards: Array.isArray(raw.cards) ? (raw.cards as RecommendationPayload["cards"]) : [],
  };
}

export async function startAnalysis(url: string): Promise<AnalyzeResponse> {
  return fetchJson<AnalyzeResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function getStatus(id: string): Promise<StatusResponse> {
  return fetchJson<StatusResponse>(`/analyze/${id}/status`);
}

export async function getGraph(id: string): Promise<GraphPayload> {
  const raw = await fetchJson<Record<string, unknown>>(`/analyze/${id}/graph`);
  return normalizeGraphPayload(raw, id);
}

export async function getDashboard(id: string): Promise<DashboardPayload> {
  return fetchJson<DashboardPayload>(`/analyze/${id}/dashboard`);
}

export async function getCompetitors(id: string): Promise<CompetitorsPayload> {
  return fetchJson<CompetitorsPayload>(`/analyze/${id}/competitors`);
}

export async function getRecommendations(id: string): Promise<RecommendationPayload> {
  const raw = await fetchJson<Record<string, unknown>>(`/analyze/${id}/recommendations`);
  return normalizeRecommendationsPayload(raw);
}
