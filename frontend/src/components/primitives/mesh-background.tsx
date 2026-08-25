"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const nodes = [
  { x: "8%", y: "18%", delay: 0 },
  { x: "22%", y: "42%", delay: 0.3 },
  { x: "38%", y: "12%", delay: 0.6 },
  { x: "55%", y: "35%", delay: 0.2 },
  { x: "72%", y: "15%", delay: 0.8 },
  { x: "88%", y: "38%", delay: 0.4 },
  { x: "15%", y: "72%", delay: 0.5 },
  { x: "45%", y: "78%", delay: 0.1 },
  { x: "70%", y: "68%", delay: 0.7 },
  { x: "92%", y: "82%", delay: 0.35 },
];

export function MeshBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="mesh-bg absolute inset-0 opacity-90" />
      <div className="grid-bg absolute inset-0 opacity-[0.35]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.72 0.19 250 / 0)" />
            <stop offset="50%" stopColor="oklch(0.72 0.19 250 / 0.6)" />
            <stop offset="100%" stopColor="oklch(0.7 0.22 290 / 0)" />
          </linearGradient>
        </defs>
        {[
          ["8%", "18%", "55%", "35%"],
          ["22%", "42%", "70%", "68%"],
          ["38%", "12%", "88%", "38%"],
          ["55%", "35%", "92%", "82%"],
          ["15%", "72%", "45%", "78%"],
        ].map(([x1, y1, x2, y2], i) => (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="url(#edgeGrad)"
            strokeWidth={1}
            initial={{ opacity: 0.15 }}
            animate={{ opacity: [0.15, 0.85, 0.15] }}
            transition={{
              duration: 3.5,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
      {nodes.map((n, i) => (
        <motion.span
          key={i}
          className="absolute size-2 rounded-full bg-[oklch(0.82_0.12_195)] shadow-[0_0_20px_oklch(0.82_0.12_195/0.8)]"
          style={{ left: n.x, top: n.y }}
          animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }}
          transition={{
            duration: 3.2,
            delay: n.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      <motion.div
        className="absolute -left-1/4 top-1/3 h-96 w-96 rounded-full bg-[oklch(0.45_0.2_290/0.25)] blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[oklch(0.4_0.18_250/0.2)] blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
// chore: note 2026-08-25T19:58:21
