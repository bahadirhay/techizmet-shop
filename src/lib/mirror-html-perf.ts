/** Mirror HTML — tema scroll/ResizeObserver reflow yükünü azalt */

import {
  LAYOUT_QUIET_SCRIPT_ID,
  LAYOUT_QUIET_SCRIPT_TAG,
} from "@/lib/mirror-layout-quiet-script";

/** Tema sticky header debug logları — gereksiz iş */
function stripThemeDebugLogs(html: string): string {
  return html.replace(/\s*console\.log\([^)]*isScrolling[^)]*\);\s*/g, "");
}

/** Eski perf CSS kalıntısı */
function stripLegacyPerfCss(html: string): string {
  return html.replace(/<style id="kn-perf-css">[\s\S]*?<\/style>/gi, "");
}

export function patchMirrorPerformance(html: string): string {
  let out = stripLegacyPerfCss(html);
  out = stripThemeDebugLogs(out);
  if (!out.includes(`id="${LAYOUT_QUIET_SCRIPT_ID}"`)) {
    out = out.replace(/<head(\b[^>]*)>/i, `<head$1>\n${LAYOUT_QUIET_SCRIPT_TAG}`);
  }
  return out;
}
