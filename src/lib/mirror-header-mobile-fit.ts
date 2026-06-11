/** Mobil header — logo menü ve TR/EN üst üste binmesin; ekrana otomatik sığdır */

export const HEADER_MOBILE_FIT_VERSION = 1;
const STYLE_ID = "kn-header-mobile-fit-style";
const SCRIPT_ID = "kn-header-mobile-fit-script";

export const HEADER_MOBILE_FIT_CSS = `
@media (max-width:991px){
  .header--wrapper{
    display:grid!important;
    grid-template-areas:"hamburger logo icons"!important;
    grid-template-columns:minmax(40px,auto) minmax(0,1fr) minmax(0,auto)!important;
    column-gap:4px!important;
    align-items:center!important;
    width:100%!important;
    box-sizing:border-box!important;
  }
  .mobile-toggler,.hamburger--toggler,[data-mobile-toggler]{
    grid-area:hamburger!important;
    justify-self:start!important;
    flex-shrink:0!important;
  }
  .header--logo{
    grid-area:logo!important;
    justify-self:start!important;
    align-self:center!important;
    min-width:0!important;
    max-width:100%!important;
    width:auto!important;
    overflow:hidden!important;
    flex-shrink:1!important;
    min-height:44px!important;
    margin:2px 0!important;
  }
  .header--navigation-main{display:none!important}
  .header--right{
    grid-area:icons!important;
    justify-self:end!important;
    min-width:0!important;
    max-width:100%!important;
    flex-shrink:0!important;
  }
  .section-header,.sticky-always.header,.sticky-on-scroll.header{
    --logo_width:min(112px,calc(100vw - 12.75rem))!important;
  }
  .header--logo .header--logo-img:not(.transparent-logo-img),
  .header--logo img.header--logo-img:not(.transparent-logo-img){
    max-height:44px!important;
    height:44px!important;
    max-width:100%!important;
    width:auto!important;
    object-fit:contain!important;
    object-position:left center!important;
  }
}
`;

export function buildHeaderMobileFitScript(): string {
  return `(function(){
var V=${HEADER_MOBILE_FIT_VERSION};
function fit(){
  if(window.innerWidth>991)return;
  var wrap=document.querySelector(".header--wrapper");
  var logo=document.querySelector(".header--logo");
  var right=document.querySelector(".header--right");
  var menu=document.querySelector("[data-mobile-toggler],.mobile-toggler,.hamburger--toggler");
  if(!wrap||!logo||!right)return;
  var gap=6;
  var reserved=(menu?menu.getBoundingClientRect().width:40)+right.getBoundingClientRect().width+gap;
  var max=Math.max(52,Math.floor(wrap.clientWidth-reserved));
  logo.style.maxWidth=max+"px";
  var img=logo.querySelector("img.header--logo-img:not(.transparent-logo-img)");
  if(img){
    img.style.maxWidth="100%";
    img.style.width="auto";
    img.style.height="44px";
    img.style.maxHeight="44px";
    img.style.objectFit="contain";
  }
}
var t;
function sched(){clearTimeout(t);t=setTimeout(fit,40);}
function boot(){
  fit();
  window.addEventListener("resize",sched,{passive:true});
  window.addEventListener("orientationchange",sched,{passive:true});
  var wrap=document.querySelector(".header--wrapper");
  if(wrap&&typeof ResizeObserver!=="undefined"){
    try{new ResizeObserver(sched).observe(wrap);}catch(e){}
  }
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(fit).catch(function(){});}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();`;
}

export function applyMirrorHeaderMobileFit(doc: Document) {
  if (!doc.getElementById(STYLE_ID)) {
    const st = doc.createElement("style");
    st.id = STYLE_ID;
    st.textContent = HEADER_MOBILE_FIT_CSS;
    doc.head.appendChild(st);
  }
  const scriptId = `${SCRIPT_ID}-v${HEADER_MOBILE_FIT_VERSION}`;
  if (!doc.getElementById(scriptId)) {
    const s = doc.createElement("script");
    s.id = scriptId;
    s.textContent = buildHeaderMobileFitScript();
    doc.body.appendChild(s);
  }
}

export function injectMirrorHeaderMobileFitHtml(html: string): string {
  if (html.includes(STYLE_ID)) return html;
  const styleTag = `<style id="${STYLE_ID}">${HEADER_MOBILE_FIT_CSS}</style>`;
  const scriptTag = `<script id="${SCRIPT_ID}-v${HEADER_MOBILE_FIT_VERSION}">${buildHeaderMobileFitScript()}</script>`;
  return html.replace(/<\/body>/i, `${styleTag}\n${scriptTag}\n</body>`);
}
