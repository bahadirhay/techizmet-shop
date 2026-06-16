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
html.kn-mirror-embed .scroll-to-top {
  position: fixed !important;
  bottom: calc(20px + var(--scroll-top-vertical-position, 10px)) !important;
  z-index: 20010 !important;
  transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease !important;
}
html.kn-mirror-embed .scroll-to-top:not(.show) {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  transform: translateY(40%) !important;
}
html.kn-mirror-embed .scroll-to-top.show {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: all !important;
  transform: none !important;
}
html.kn-mirror-embed header.section-header {
  position: relative !important;
}
html.kn-mirror-embed header.section-header.kn-mirror-header-pinned {
  z-index: 10005 !important;
  will-change: transform;
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

const SCROLL_BRIDGE_SCRIPT = `(function(){
  var parentWin=window.parent;
  if(!parentWin||parentWin===window)return;
  var root=document.documentElement;
  if(root.getAttribute("data-kn-scroll-bridge")==="1")return;
  root.setAttribute("data-kn-scroll-bridge","1");
  var btn=document.querySelector("[back-to-top-button]");
  var topBtnThreshold=400;
  var stickyThreshold=100;
  var prevScroll=0;
  function headerEls(){
    return {
      section:document.querySelector("header.section-header"),
      sticky:document.querySelector("sticky-always.header")||document.querySelector("sticky-on-scroll.header")
    };
  }
  function readParentScroll(){
    try{
      var doc=parentWin.document;
      return parentWin.pageYOffset||doc.documentElement.scrollTop||doc.body.scrollTop||0;
    }catch(e){return 0;}
  }
  function headerHeight(){
    if(!sticky)return 0;
    return sticky.getBoundingClientRect().height||0;
  }
  function syncHeader(st){
    var els=headerEls();
    var section=els.section;
    var sticky=els.sticky;
    if(!section||!sticky)return;
    var h=headerHeight();
    if(h>0)document.body.style.setProperty("--dynamic_header_height",h.toFixed(2)+"px");
    var pinAt=section.offsetTop||0;
    var isOnScroll=sticky.tagName==="STICKY-ON-SCROLL";
    if(st>pinAt){
      section.classList.add("kn-mirror-header-pinned");
      section.style.transform="translateY("+(st-pinAt)+"px)";
      if(st>stickyThreshold){
        sticky.classList.add("is-sticky");
        document.body.classList.add("header-sticky");
        if(isOnScroll){
          var down=st>prevScroll;
          if(down&&!document.body.classList.contains("kn-nav-dropdown-open")){
            sticky.classList.add("is-hidden");
            section.classList.add("is-hidden-header");
            document.body.classList.remove("header-sticky");
            document.body.style.setProperty("--dynamic_header_height","0px");
          }else{
            sticky.classList.remove("is-hidden");
            section.classList.remove("is-hidden-header");
            document.body.classList.add("header-sticky");
            if(h>0)document.body.style.setProperty("--dynamic_header_height",h.toFixed(2)+"px");
          }
        }
      }
    }else{
      section.classList.remove("kn-mirror-header-pinned");
      section.style.transform="";
      sticky.classList.remove("is-sticky","is-hidden");
      section.classList.remove("is-hidden-header");
      document.body.classList.add("header-sticky");
      if(h>0)document.body.style.setProperty("--dynamic_header_height",h.toFixed(2)+"px");
    }
    prevScroll=st;
  }
  function sync(){
    try{
      var st=readParentScroll();
      if(btn){
        if(st>topBtnThreshold)btn.classList.add("show");
        else btn.classList.remove("show");
      }
      syncHeader(st);
    }catch(e){}
  }
  parentWin.addEventListener("scroll",sync,{passive:true});
  try{parentWin.document.addEventListener("scroll",sync,{passive:true});}catch(e){}
  window.addEventListener("resize",sync,{passive:true});
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",sync,{once:true});
  }
  sync();
  setTimeout(sync,120);
  setTimeout(sync,600);
  if(btn){
    btn.classList.remove("show");
    btn.addEventListener("click",function(ev){
      ev.preventDefault();
      try{parentWin.scrollTo({top:0,behavior:"smooth"});}
      catch(e){try{parentWin.scrollTo(0,0);}catch(e2){}}
    });
  }
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
