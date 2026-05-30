/** Mirror HTML — performans: tema script’lerine dokunulmaz */

/** Scroll dinleyici enjeksiyonu kaldırıldı — tema init bozulmasın */
export function patchMirrorPerformance(html: string): string {
  return html.replace(/<style id="kn-perf-css">[\s\S]*?<\/style>/gi, "");
}
