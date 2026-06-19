"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import type { GraphPayload, NeoNode } from "@/lib/api/types";
import { CitationNode } from "@/components/graph/citation-node";
import { GlassPanel } from "@/components/primitives/glass-panel";
import { buildFlowGraph, getEdgesForNode, getNodeById } from "@/lib/graph/flow-adapter";

const nodeTypes = { citation: CitationNode };

interface CitationGraphViewProps {
  graph: GraphPayload;
}

function GraphCanvas({ graph }: CitationGraphViewProps) {
  const initial = useMemo(() => buildFlowGraph(graph), [graph]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [selected, setSelected] = useState<NeoNode | null>(graph.nodes[0] ?? null);

  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
    setSelected(graph.nodes[0] ?? null);
  }, [graph, initial.edges, initial.nodes, setEdges, setNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      const neo = getNodeById(graph, node.id);
      if (neo) setSelected(neo);
    },
    [graph]
  );

  const related = selected ? getEdgesForNode(graph, selected.id) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <GlassPanel className="relative h-[min(640px,70vh)] min-h-[420px] overflow-hidden p-0 lg:h-[calc(100dvh-8rem)]">
        <div className="absolute left-4 top-4 z-10 max-w-xs rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[10px] text-muted-foreground backdrop-blur-md">
          <span className="text-foreground">Neo4j-style</span> property graph · zoom / pan ·
          click nodes
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.4}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <Background
            id="cited-grid"
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="oklch(1 0 0 / 8%)"
          />
          <Controls className="!m-3 !border-white/10 !bg-black/60 !shadow-xl [&_button]:!fill-foreground" />
          <MiniMap
            className="!m-3 !rounded-lg !border !border-white/10 !bg-black/70"
            nodeColor={() => "oklch(0.72 0.19 250 / 0.5)"}
          />
        </ReactFlow>
      </GlassPanel>

      <GlassPanel className="flex max-h-[min(640px,70vh)] flex-col gap-4 overflow-auto p-5 lg:max-h-[calc(100dvh-8rem)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Selection
          </p>
          <h2 className="mt-1 font-heading text-lg font-semibold leading-tight">
            {selected?.properties.name ?? "Select a node"}
          </h2>
          {selected?.labels.includes("Query") ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Buyer-intent query mapped to live model and citation edges.
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {selected?.properties.subtitle ?? "Entity in the citation layer."}
            </p>
          )}
        </div>

        {selected && (
          <>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="font-mono text-[9px] text-muted-foreground">Citation strength</p>
                <p className="mt-1 font-heading text-lg text-cyan-300">
                  {selected.properties.citationStrength != null
                    ? `${Math.round(selected.properties.citationStrength * 100)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="font-mono text-[9px] text-muted-foreground">AI visibility</p>
                <p className="mt-1 font-heading text-lg text-violet-300">
                  {selected.properties.aiVisibility != null
                    ? `${selected.properties.aiVisibility}%`
                    : "—"}
                </p>
              </div>
              <div className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-2">
                <p className="font-mono text-[9px] text-muted-foreground">GEO score</p>
                <p className="mt-1 font-heading text-lg text-primary">
                  {selected.properties.geoScore != null
                    ? `${selected.properties.geoScore}`
                    : "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Recommendations
              </p>
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                <li>
                  Strengthen{" "}
                  <span className="text-foreground">entity-typed copy</span> on pages that
                  answer this query family.
                </li>
                <li>
                  Add <span className="text-foreground">FAQPage JSON-LD</span> aligned to
                  comparison-style prompts.
                </li>
                <li>
                  Tessl Skill: <span className="font-mono text-foreground">geo_rewrite</span>{" "}
                  can expand bullets from this node&apos;s neighborhood.
                </li>
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Incident edges
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto font-mono text-[10px] text-muted-foreground">
                {related.map((e) => (
                  <li key={e.id} className="rounded border border-white/5 bg-black/30 px-2 py-1">
                    {e.source} —[{e.type}]→ {e.target}
                    {e.strength != null ? ` · ${(e.strength * 100).toFixed(0)}%` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </GlassPanel>
    </div>
  );
}

export function CitationGraphView({ graph }: CitationGraphViewProps) {
  if (!graph.nodes.length) {
    return (
      <GlassPanel className="p-8 text-center text-sm text-muted-foreground">
        No graph nodes have been written for this analysis yet.
      </GlassPanel>
    );
  }

  return (
    <ReactFlowProvider>
      <GraphCanvas graph={graph} />
    </ReactFlowProvider>
  );
}
// chore: note 2026-06-19T16:16:00
