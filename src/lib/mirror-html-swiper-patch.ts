type SwiperCfg = Record<string, unknown> & {
  loop?: boolean;
  slidesPerView?: number | string;
  slidesPerGroup?: number;
  slidesPerGroupAuto?: boolean;
  loopAdditionalSlides?: number;
  breakpoints?: Record<string, SwiperCfg>;
};

function minSlidesForLoop(cfg: SwiperCfg): number {
  let max = 0;

  const check = (c: SwiperCfg) => {
    if (!c?.loop) return;
    const spvRaw = c.slidesPerView;
    const spv = typeof spvRaw === "number" ? spvRaw : 1;
    const f = Math.ceil(spv);
    const spg = typeof c.slidesPerGroup === "number" ? c.slidesPerGroup : 1;
    const loopAdditional =
      typeof c.loopAdditionalSlides === "number" ? c.loopAdditionalSlides : 0;
    let w = c.slidesPerGroupAuto ? f : spg;
    if (w % spg !== 0) w += spg - (w % spg);
    w += loopAdditional;
    max = Math.max(max, f + w);
  };

  check(cfg);
  if (cfg.breakpoints) {
    for (const bp of Object.values(cfg.breakpoints)) check(bp);
  }
  return max;
}

function disableLoopWhenInsufficient(cfg: SwiperCfg, slideCount: number): SwiperCfg {
  const need = minSlidesForLoop(cfg);
  if (need === 0 || slideCount >= need) return cfg;

  const out: SwiperCfg = { ...cfg, loop: false };
  if (cfg.breakpoints) {
    out.breakpoints = {};
    for (const [key, bp] of Object.entries(cfg.breakpoints)) {
      out.breakpoints[key] = bp?.loop ? { ...bp, loop: false } : { ...bp };
    }
  }
  return out;
}

function countSwiperSlides(snippet: string): number {
  return (snippet.match(/class="[^"]*\bswiper-slide\b[^"]*"/g) ?? []).length;
}

/** data-swiper JSON — az slayt varsa loop kapatılır */
export function patchMirrorSwiperLoopInHtml(html: string): string {
  const re = /data-swiper=(['"])\s*(\{[\s\S]*?\})\s*\1/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    result += html.slice(lastIndex, match.index);
    const quote = match[1];
    const jsonStr = match[2];
    const after = html.slice(match.index + match[0].length, match.index + match[0].length + 12000);
    const slideCount = countSwiperSlides(after);

    let nextJson = jsonStr;
    try {
      const cfg = JSON.parse(jsonStr) as SwiperCfg;
      const patched = disableLoopWhenInsufficient(cfg, slideCount);
      nextJson = JSON.stringify(patched, null, 2);
    } catch {
      /* keep original */
    }

    result += `data-swiper=${quote}${nextJson}${quote}`;
    lastIndex = re.lastIndex;
  }

  result += html.slice(lastIndex);
  return result;
}

const SWIPER_RUNTIME = `<script id="kn-swiper-runtime">(function(){var w=console.warn;console.warn=function(){if(arguments[0]&&String(arguments[0]).indexOf("Swiper Loop Warning")!==-1)return;return w.apply(console,arguments);};function wrap(){if(typeof Swiper==="undefined"||Swiper.__knW)return;var O=Swiper;function W(el,cfg){cfg=cfg?JSON.parse(JSON.stringify(cfg)):{};if(cfg.loop){var root=typeof el==="string"?document.querySelector(el):el;if(root){var n=root.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)").length;var need=2;if(cfg.breakpoints)Object.keys(cfg.breakpoints).forEach(function(k){var b=cfg.breakpoints[k];if(b&&b.loop){var spv=typeof b.slidesPerView==="number"?b.slidesPerView:1;var f=Math.ceil(spv);need=Math.max(need,f+1);}});if(typeof cfg.slidesPerView==="number")need=Math.max(need,Math.ceil(cfg.slidesPerView)+1);if(n>0&&n<need)cfg.loop=false;}}return new O(el,cfg);}for(var k in O)if(Object.prototype.hasOwnProperty.call(O,k))W[k]=O[k];W.prototype=O.prototype;W.__knW=true;window.Swiper=W;}wrap();document.addEventListener("DOMContentLoaded",wrap);})();</script>`;

/** swiper-bundle.js sonrasına runtime yaması ekler */
export function injectMirrorSwiperRuntime(html: string): string {
  if (html.includes('id="kn-swiper-runtime"')) return html;

  const tagged = html.replace(
    /(<script\b[^>]*\ssrc=["'][^"']*swiper-bundle[^"']*["'][^>]*>\s*<\/script>)/i,
    `$1${SWIPER_RUNTIME}`,
  );

  if (tagged !== html) return tagged;
  return html.replace(/<head>/i, `<head>${SWIPER_RUNTIME}`);
}

export function patchMirrorSwiperHtml(html: string): string {
  return injectMirrorSwiperRuntime(patchMirrorSwiperLoopInHtml(html));
}
