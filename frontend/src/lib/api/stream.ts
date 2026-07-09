import type { AnalysisEvent } from "@/lib/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function subscribeToAnalysis(
  analysisId: string,
  onEvent: (event: AnalysisEvent) => void
): () => void {
  const source = new EventSource(`${API_BASE_URL}/analyze/${analysisId}/stream`);
  let closed = false;
  let errorTimer: number | null = null;

  async function checkStatusAfterDisconnect() {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze/${analysisId}/status`, {
        cache: "no-store",
      });
      if (!response.ok) {
        if (source.readyState === EventSource.CLOSED && !closed) {
          onEvent({ stage: "failed", error: "Live stream disconnected." });
          source.close();
          closed = true;
        }
        return;
      }

      const status = (await response.json()) as { status?: string; error?: string | null };
      if (closed) return;

      if (status.status === "done") {
        onEvent({ stage: "done" });
        source.close();
        closed = true;
        return;
      }

      if (status.status === "failed") {
        onEvent({ stage: "failed", error: status.error ?? "Analysis failed." });
        source.close();
        closed = true;
      }
    } catch {
      if (source.readyState === EventSource.CLOSED && !closed) {
        onEvent({ stage: "failed", error: "Live stream disconnected." });
        source.close();
        closed = true;
      }
    }
  }

  source.onmessage = (message) => {
    if (errorTimer != null) {
      window.clearTimeout(errorTimer);
      errorTimer = null;
    }
    const parsed = JSON.parse(message.data) as AnalysisEvent;
    onEvent(parsed);
    if (parsed.stage === "done" || parsed.stage === "failed") {
      source.close();
      closed = true;
    }
  };

  source.onerror = () => {
    if (closed || errorTimer != null) return;
    errorTimer = window.setTimeout(() => {
      errorTimer = null;
      void checkStatusAfterDisconnect();
    }, 1500);
  };

  return () => {
    closed = true;
    if (errorTimer != null) window.clearTimeout(errorTimer);
    source.close();
  };
}
// chore: note 2026-07-09T12:19:05
