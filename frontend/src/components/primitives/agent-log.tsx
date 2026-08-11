"use client";

import { useEffect, useRef } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function AgentLog({
  lines,
  className,
}: {
  lines: string[];
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <ScrollArea
      className={cn(
        "h-[min(360px,45vh)] rounded-lg border border-white/10 bg-black/50 font-mono text-xs text-muted-foreground",
        className
      )}
    >
      <div className="space-y-1 p-4">
        {lines.map((line, i) => (
          <div
            key={`${i}-${line}`}
            className="whitespace-pre-wrap leading-relaxed text-[oklch(0.88_0.02_260)]"
          >
            <span className="text-[oklch(0.55_0.08_260)]">
              {String(i + 1).padStart(3, "0")}
            </span>{" "}
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
// chore: note 2026-08-11T20:20:36
