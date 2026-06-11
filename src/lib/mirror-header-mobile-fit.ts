/** Mobil header — logo menü ve ikonlar üst üste binmesin */

export const HEADER_MOBILE_FIT_VERSION = 2;
const STYLE_ID = "kn-header-mobile-fit-style";
const SCRIPT_ID = "kn-header-mobile-fit-script";

export const HEADER_MOBILE_FIT_CSS = `
@media (max-width:1024px){
  .header .header--wrapper,
  .header .header--wrapper.logo-left-menu-left,
  .header .header--wrapper.logo-left-menu-center,
  .header .header--wrapper.logo-left-menu-right{
    display:grid!important;
    grid-template-areas:"hamburger logo icons"!important;
    grid-template-columns:44px minmax(0,1fr) auto!important;
    column-gap:6px!important;
    align-items:center!important;
    width:100%!important;
    box-sizing:border-box!important;
    min-height:52px!important;
  }
  .mobile-toggler,.hamburger--toggler,[data-mobile-toggler]{
    grid-area:hamburger!important;
    justify-self:start!important;
    flex-shrink:0!important;
  }
  .header--navigation-main,
  .header--navigation-main.header--navigation{display:none!important}
  .header--logo{
    grid-area:logo!important;
    justify-self:stretch!important;
    justify-content:flex-start!important;
    align-items:center!important;
    min-width:0!important;
    max-width:100%!important;
    width:auto!important;
    overflow:hidden!important;
    flex-shrink:1!important;
    min-height:40px!important;
    margin:0!important;
    padding:0!important;
  }
  .header--right{
    grid-area:icons!important;
    justify-self:end!important;
    min-width:0!important;
    max-width:100%!important;
    flex-shrink:0!important;
    margin-left:0!important;
  }
  .header--icons-list>.header--icon-item.kn-locale-icon-item{display:none!important}
  .mobile--menu-footer .kn-iframe-locale{display:inline-flex!important}
  .section-header,.sticky-always.header,.sticky-on-scroll.header{
    --logo_width:min(100px,calc(100vw - 10.5rem))!important;
  }
  .header--logo .header--logo-img:not(.transparent-logo-img),
  .header--logo img.header--logo-img:not(.transparent-logo-img){
    max-height:40px!important;
    height:40px!important;
    max-width:100%!important;
    width:auto!important;
    object-fit:contain!important;
    object-position:left center!important;
  }
  .header--icons-list .header--icon-link-text{
    width:34px!important;
    height:34px!important;
    min-width:34px!important;
    min-height:34px!important;
  }
}
`;

export function buildHeaderMobileFitScript(): string {
  return `(function(){
var BP=1024;
function fit(){
  if(window.innerWidth>BP)return;
  var wrap=document.querySelector(".header--wrapper");
  var logo=document.querySelector(".header--logo");
  var right=document.querySelector(".header--right");
  var menu=document.querySelector("[data-mobile-toggler],.mobile-toggler,.hamburger--toggler");
  if(!wrap||!logo||!right)return;
  var gap=8;
  var reserved=(menu?menu.getBoundingClientRect().width:44)+right.getBoundingClientRect().width+gap;
  var max=Math.max(48,Math.floor(wrap.clientWidth-reserved));
  logo.style.maxWidth=max+"px";
  var img=logo.querySelector("img.header--logo-img:not(.transparent-logo-img)");
  if(img){
    img.style.maxWidth="100%";
    img.style.width="auto";
    img.style.height="40px";
    img.style.maxHeight="40px";
    img.style.objectFit="contain";
    img.style.objectPosition="left center";
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
  var logoImg=document.querySelector(".header--logo img.header--logo-img:not(.transparent-logo-img)");
  if(logoImg&&!logoImg.complete)logoImg.addEventListener("load",fit,{once:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();`;
}

export function applyMirrorHeaderMobileFit(doc: Document) {
  let st = doc.getElementById(STYLE_ID);
  if (!st) {
    st = doc.createElement("style");
    st.id = STYLE_ID;
    doc.head.appendChild(st);
  }
  st.textContent = HEADER_MOBILE_FIT_CSS;

  const scriptId = `${SCRIPT_ID}-v${HEADER_MOBILE_FIT_VERSION}`;
  doc.querySelectorAll(`[id^="${SCRIPT_ID}-v"]`).forEach((el) => el.remove());
  if (!doc.getElementById(scriptId)) {
    const s = doc.createElement("script");
    s.id = scriptId;
    s.textContent = buildHeaderMobileFitScript();
    doc.body.appendChild(s);
  }
}

export function injectMirrorHeaderMobileFitHtml(html: string): string {
  const styleTag = `<style id="${STYLE_ID}">${HEADER_MOBILE_FIT_CSS}</style>`;
  const scriptTag = `<script id="${SCRIPT_ID}-v${HEADER_MOBILE_FIT_VERSION}">${buildHeaderMobileFitScript()}</script>`;
  let out = html;
  if (out.includes(STYLE_ID)) {
    out = out.replace(new RegExp(`<style id="${STYLE_ID}"[^>]*>[\\s\\S]*?</style>`, "i"), styleTag);
    out = out.replace(/<script id="kn-header-mobile-fit-script-v\d+"[^>]*>[\s\S]*?<\/script>/gi, "");
  }
  if (!out.includes(STYLE_ID)) {
    out = out.replace(/<\/body>/i, `${styleTag}\n${scriptTag}\n</body>`);
    return out;
  }
  if (!out.includes(scriptTag.slice(0, 40))) {
    out = out.replace(/<\/body>/i, `${scriptTag}\n</body>`);
  }
  return out;
}
