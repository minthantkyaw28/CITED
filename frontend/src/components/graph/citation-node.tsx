"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";

import type { NeoNode } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export type CitationNodeData = {
  neo: NeoNode;
  accent: string;
};

function CitationNodeInner({ data }: NodeProps) {
  const { neo, accent } = data as CitationNodeData;

  return (
    <motion.div
      className={cn(
        "min-w-[120px] max-w-[200px] rounded-xl border bg-black/60 px-3 py-2 shadow-lg backdrop-blur-md",
        "ring-1 ring-white/10"
      )}
      style={{
        borderColor: `${accent}55`,
        boxShadow: `0 0 28px -6px ${accent}66`,
      }}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <Handle type="target" position={Position.Top} className="!size-2 !border-0 !bg-cyan-400" />
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {neo.labels.join(" · ")}
      </p>
      <p className="mt-1 font-heading text-xs font-semibold leading-snug text-foreground">
        {neo.properties.name}
      </p>
      {neo.properties.subtitle ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">
          {neo.properties.subtitle}
        </p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!size-2 !border-0 !bg-violet-400" />
    </motion.div>
  );
}

export const CitationNode = memo(CitationNodeInner);
// chore: note 2026-07-10T20:51:37
