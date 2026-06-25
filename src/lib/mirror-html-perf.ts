/** Mirror HTML — tema scroll/ResizeObserver reflow yükünü azalt */

import {
  LAYOUT_QUIET_SCRIPT_ID,
  LAYOUT_QUIET_SCRIPT_TAG,
} from "@/lib/mirror-layout-quiet-script";

const MOBILE_PERF_GUARD_ID = "kn-mobile-perf-guard";

const MOBILE_PERF_GUARD_TAG = `<script id="${MOBILE_PERF_GUARD_ID}">
(function(){
  if(!window.matchMedia('(max-width:768px)').matches)return;
  var block=/gsap|ScrollTrigger|SplitText|animatef747/i;
  function drop(){
    document.querySelectorAll('script[src]').forEach(function(s){
      if(block.test(s.src||''))s.remove();
    });
  }
  drop();
  new MutationObserver(drop).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',function(){drop();},{once:true});
})();
</script>`;

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
  if (!out.includes(`id="${MOBILE_PERF_GUARD_ID}"`)) {
    out = out.replace(/<head(\b[^>]*)>/i, `<head$1>\n${MOBILE_PERF_GUARD_TAG}`);
  }
  return out;
}
