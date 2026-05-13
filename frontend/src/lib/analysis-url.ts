/** Preserve the current analysis id when navigating between app routes. */
export function withAnalysisId(href: string, analysisId: string | null): string {
  if (!analysisId) return href;
  return `${href}?id=${encodeURIComponent(analysisId)}`;
}
