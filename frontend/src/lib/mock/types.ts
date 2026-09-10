export type GraphLabel =
  | "Brand"
  | "Competitor"
  | "Model"
  | "Keyword"
  | "Query";

export type EdgeType = "MENTIONS" | "CITES" | "RANKS";

export interface NeoNode {
  id: string;
  labels: GraphLabel[];
  properties: {
    name: string;
    geoScore?: number;
    citationStrength?: number;
    aiVisibility?: number;
    subtitle?: string;
  };
}

export interface NeoEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  strength?: number;
}

export type Severity = "critical" | "high" | "medium" | "low";
