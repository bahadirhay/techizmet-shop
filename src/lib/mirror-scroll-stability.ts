/** Mirror iframe — scroll anchoring azaltma (kaydırma iframe içinde kalır) */

import { injectMirrorEmbedBoot } from "@/lib/mirror-embed-boot";

const STYLE_ID = "kn-scroll-stability-style";
const SCRIPT_ID = "kn-scroll-stability-script";

export const MIRROR_SCROLL_STABILITY_CSS = `
html, body {
  overflow-anchor: none !important;
}
.section-video .media,
.section-video .video--wrapper,
.kn-video-embed-host {
  contain: layout paint;
  overflow: hidden;
}
.section-video video.videoBackgroundFile {
  display: block;
  width: 100%;
  height: 100%;
  max-height: min(70vh, 56.25vw);
  object-fit: cover;
}
`;

const SCROLL_GUARD_SCRIPT = `(function(){
  function killRevealScroll(){
    try{
      document.querySelectorAll(".section-revealing-text reveal-text").forEach(function(n){ n.remove(); });
      if(typeof ScrollTrigger!=="undefined"&&ScrollTrigger.getAll){
        ScrollTrigger.getAll().forEach(function(st){
          var tr=st&&st.trigger;
          if(tr&&tr.closest&&tr.closest(".section-revealing-text"))st.kill();
        });
      }
    }catch(e){}
  }
  killRevealScroll();
  setTimeout(killRevealScroll,80);
  setTimeout(killRevealScroll,600);
})();`;

export function applyMirrorScrollStability(doc: Document) {
  if (!doc.getElementById(STYLE_ID)) {
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = MIRROR_SCROLL_STABILITY_CSS;
    doc.head.appendChild(style);
  }
  if (!doc.getElementById(SCRIPT_ID)) {
    const script = doc.createElement("script");
    script.id = SCRIPT_ID;
    script.textContent = SCROLL_GUARD_SCRIPT;
    (doc.body ?? doc.documentElement).appendChild(script);
  }
  injectMirrorEmbedBoot(doc);
}
