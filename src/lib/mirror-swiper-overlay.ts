/** Swiper loop — istemci tarafı yedek yama */

const SCRIPT_ID = "kn-swiper-quiet-script";

export function installMirrorSwiperQuiet(doc: Document) {
  if (doc.getElementById(SCRIPT_ID)) return;

  doc.querySelectorAll<HTMLElement>("[data-swiper]").forEach((el) => {
    const raw = el.getAttribute("data-swiper");
    if (!raw) return;
    try {
      const cfg = JSON.parse(raw) as {
        loop?: boolean;
        slidesPerView?: number;
        breakpoints?: Record<string, { loop?: boolean; slidesPerView?: number }>;
      };
      const snippet = el.innerHTML;
      const slideCount = (snippet.match(/class="[^"]*\bswiper-slide\b[^"]*"/g) ?? []).length;
      let need = 0;
      const check = (c: { loop?: boolean; slidesPerView?: number }) => {
        if (!c?.loop) return;
        const f = Math.ceil(typeof c.slidesPerView === "number" ? c.slidesPerView : 1);
        need = Math.max(need, f + 1);
      };
      check(cfg);
      if (cfg.breakpoints) Object.values(cfg.breakpoints).forEach(check);
      if (need > 0 && slideCount > 0 && slideCount < need) {
        cfg.loop = false;
        if (cfg.breakpoints) {
          for (const bp of Object.values(cfg.breakpoints)) {
            if (bp?.loop) bp.loop = false;
          }
        }
        el.setAttribute("data-swiper", JSON.stringify(cfg));
      }
    } catch {
      /* ignore */
    }
  });

  const script = doc.createElement("script");
  script.id = SCRIPT_ID;
  script.textContent = `(function(){var w=console.warn;console.warn=function(){if(arguments[0]&&String(arguments[0]).indexOf("Swiper Loop Warning")!==-1)return;return w.apply(console,arguments);};function wrap(){if(typeof Swiper==="undefined"||Swiper.__knW)return;var O=Swiper;function W(el,cfg){cfg=cfg?JSON.parse(JSON.stringify(cfg)):{};if(cfg.loop){var root=typeof el==="string"?document.querySelector(el):el;if(root){var n=root.querySelectorAll(".swiper-slide:not(.swiper-slide-duplicate)").length;var need=2;if(cfg.breakpoints)Object.keys(cfg.breakpoints).forEach(function(k){var b=cfg.breakpoints[k];if(b&&b.loop){var spv=typeof b.slidesPerView==="number"?b.slidesPerView:1;need=Math.max(need,Math.ceil(spv)+1);}});if(typeof cfg.slidesPerView==="number")need=Math.max(need,Math.ceil(cfg.slidesPerView)+1);if(n>0&&n<need)cfg.loop=false;}}return new O(el,cfg);}for(var k in O)if(Object.prototype.hasOwnProperty.call(O,k))W[k]=O[k];W.prototype=O.prototype;W.__knW=true;window.Swiper=W;}wrap();})();`;
  (doc.head ?? doc.body).appendChild(script);
}
