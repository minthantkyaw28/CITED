import type { AnalysisEvent } from "@/lib/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export function subscribeToAnalysis(
  analysisId: string,
  onEvent: (event: AnalysisEvent) => void
): () => void {
  const source = new EventSource(`${API_BASE_URL}/analyze/${analysisId}/stream`);

  source.onmessage = (message) => {
    const parsed = JSON.parse(message.data) as AnalysisEvent;
    onEvent(parsed);
    if (parsed.stage === "done" || parsed.stage === "failed") {
      source.close();
    }
  };

  source.onerror = () => {
    onEvent({ stage: "failed", error: "Live stream disconnected." });
    source.close();
  };

  return () => source.close();
}
