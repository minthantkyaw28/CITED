import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";

import type { GraphPayload, NeoEdge, NeoNode } from "@/lib/api/types";

const labelAccent: Record<string, string> = {
  Brand: "#22d3ee",
  Competitor: "#a78bfa",
  Model: "#60a5fa",
  Keyword: "#f472b6",
  Query: "#34d399",
};

function edgeColor(type: NeoEdge["type"]) {
  if (type === "CITES") return "oklch(0.72 0.19 250 / 0.85)";
  if (type === "MENTIONS") return "oklch(0.7 0.22 290 / 0.75)";
  return "oklch(0.82 0.12 195 / 0.65)";
}

function computeLayout(graph: GraphPayload) {
  const groups = new Map<string, NeoNode[]>();
  for (const node of graph.nodes) {
    const label = node.labels[0] ?? "Keyword";
    const group = groups.get(label) ?? [];
    group.push(node);
    groups.set(label, group);
  }

  const orderedLabels = ["Competitor", "Model", "Keyword", "Query"];
  const centerX = 420;
  const centerY = 280;
  const layout = new Map<string, { x: number; y: number }>();

  const brandNodes = groups.get("Brand") ?? [];
  brandNodes.forEach((node, index) => {
    layout.set(node.id, {
      x: centerX + index * 120,
      y: centerY,
    });
  });

  orderedLabels.forEach((label) => {
    const nodes = groups.get(label) ?? [];
    if (!nodes.length) return;
    const anchorByLabel: Record<string, { x: number; y: number }> = {
      Competitor: { x: centerX - 280, y: centerY },
      Model: { x: centerX, y: centerY - 220 },
      Keyword: { x: centerX, y: centerY + 220 },
      Query: { x: centerX + 280, y: centerY },
    };
    const anchor = anchorByLabel[label] ?? { x: centerX, y: centerY };
    nodes.forEach((node, index) => {
      const spreadAngle = nodes.length === 1 ? 0 : ((Math.PI * 2) / nodes.length) * index;
      const spreadRadius = 90;
      layout.set(node.id, {
        x: anchor.x + Math.cos(spreadAngle) * spreadRadius,
        y: anchor.y + Math.sin(spreadAngle) * spreadRadius,
      });
    });
  });

  return layout;
}

export function buildFlowGraph(graph: GraphPayload): { nodes: Node[]; edges: Edge[] } {
  const layout = computeLayout(graph);
  const nodes: Node[] = graph.nodes.map((n) => {
    const pos = layout.get(n.id) ?? { x: 0, y: 0 };
    const primary = n.labels[0] ?? "Keyword";
    return {
      id: n.id,
      type: "citation",
      position: pos,
      data: {
        neo: n,
        accent: labelAccent[primary] ?? "#94a3b8",
      },
    };
  });

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
    style: {
      stroke: edgeColor(e.type),
      strokeWidth: 1.5 + (e.strength ?? 0.5) * 1.2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edgeColor(e.type),
      width: 18,
      height: 18,
    },
    label: e.type,
    labelStyle: { fill: "oklch(0.75 0.02 260)", fontSize: 9, fontWeight: 600 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
    labelBgStyle: { fill: "oklch(0.12 0.02 285 / 0.9)" },
  }));

  return { nodes, edges };
}

export function getNodeById(graph: GraphPayload, id: string): NeoNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export function getEdgesForNode(graph: GraphPayload, nodeId: string): NeoEdge[] {
  return graph.edges.filter((e) => e.source === nodeId || e.target === nodeId);
}
