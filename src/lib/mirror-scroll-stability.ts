/** Mirror iframe — otomatik kaydırma / scroll anchoring azaltma */

const STYLE_ID = "kn-scroll-stability-style";
const SCRIPT_ID = "kn-scroll-stability-script";
const SCROLL_BRIDGE_SCRIPT_ID = "kn-scroll-bridge-script";

export const MIRROR_EMBED_SCROLL_LOCK_CSS = `
html.kn-mirror-embed,
html.kn-mirror-embed body {
  overflow-x: clip !important;
  overflow-y: hidden !important;
  height: auto !important;
  scrollbar-width: none !important;
}
html.kn-mirror-embed *::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
`;

export const MIRROR_SCROLL_STABILITY_CSS = `
html, body {
  overflow-anchor: none !important;
}
${MIRROR_EMBED_SCROLL_LOCK_CSS}
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

const SCROLL_BRIDGE_SCRIPT = `(function(){
  var parentWin=window.parent;
  if(!parentWin||parentWin===window)return;
  var root=document.documentElement;
  if(root.getAttribute("data-kn-scroll-bridge")==="1")return;
  root.setAttribute("data-kn-scroll-bridge","1");
  var btn=document.querySelector("[back-to-top-button]");
  if(!btn)return;
  function sync(){
    try{
      var st=parentWin.pageYOffset||parentWin.document.documentElement.scrollTop||0;
      if(st>1000)btn.classList.add("show");
      else btn.classList.remove("show");
    }catch(e){}
  }
  parentWin.addEventListener("scroll",sync,{passive:true});
  sync();
  btn.addEventListener("click",function(ev){
    ev.preventDefault();
    try{parentWin.scrollTo({top:0,behavior:"smooth"});}
    catch(e){try{parentWin.scrollTo(0,0);}catch(e2){}}
  });
})();`;

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
  if (!doc.getElementById(SCROLL_BRIDGE_SCRIPT_ID)) {
    const bridge = doc.createElement("script");
    bridge.id = SCROLL_BRIDGE_SCRIPT_ID;
    bridge.textContent = SCROLL_BRIDGE_SCRIPT;
    (doc.body ?? doc.documentElement).appendChild(bridge);
  }
}
