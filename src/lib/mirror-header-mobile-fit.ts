/** Mobil header — logo alanı küçülür, görsel kalan alana sığar; TR/EN görünür kalır */

export const HEADER_MOBILE_FIT_VERSION = 5;
const STYLE_ID = "kn-header-mobile-fit-style";
const SCRIPT_ID = "kn-header-mobile-fit-script";
const MOBILE_BP = 1024;
const LOGO_MAX_H = 36;

export const HEADER_MOBILE_FIT_CSS = `
@media (max-width:${MOBILE_BP}px){
  html.kn-mobile-header .header .header--wrapper,
  html.kn-mobile-header .header .header--wrapper.logo-left-menu-left,
  html.kn-mobile-header .header .header--wrapper.logo-left-menu-center,
  html.kn-mobile-header .header .header--wrapper.logo-left-menu-right{
    display:grid!important;
    grid-template-areas:"hamburger logo icons"!important;
    grid-template-columns:40px minmax(0,1fr) auto!important;
    column-gap:4px!important;
    align-items:center!important;
    width:100%!important;
    box-sizing:border-box!important;
    min-height:48px!important;
  }
  html.kn-mobile-header .mobile-toggler,
  html.kn-mobile-header .hamburger--toggler,
  html.kn-mobile-header [data-mobile-toggler]{
    grid-area:hamburger!important;
    justify-self:start!important;
    flex-shrink:0!important;
  }
  html.kn-mobile-header .header--navigation-main,
  html.kn-mobile-header .header--navigation-main.header--navigation{display:none!important}
  html.kn-mobile-header .header--logo{
    grid-area:logo!important;
    justify-self:stretch!important;
    justify-content:flex-start!important;
    align-items:center!important;
    min-width:0!important;
    max-width:100%!important;
    width:auto!important;
    overflow:hidden!important;
    flex-shrink:1!important;
    min-height:${LOGO_MAX_H}px!important;
    max-height:${LOGO_MAX_H}px!important;
    margin:0!important;
    padding:0!important;
  }
  html.kn-mobile-header .header--right{
    grid-area:icons!important;
    justify-self:end!important;
    min-width:0!important;
    flex-shrink:0!important;
    margin-left:0!important;
  }
  html.kn-mobile-header .header--logo .header--logo-img:not(.transparent-logo-img),
  html.kn-mobile-header .header--logo img.header--logo-img:not(.transparent-logo-img){
    display:block!important;
    max-width:100%!important;
    width:auto!important;
    height:auto!important;
    max-height:${LOGO_MAX_H}px!important;
    object-fit:contain!important;
    object-position:left center!important;
  }
  html.kn-mobile-header .header--logo .transparent-logo-img{
    max-height:${LOGO_MAX_H}px!important;
  }
  html.kn-mobile-header .header--icons-list .kn-locale-icon-item{
    display:flex!important;
    flex:0 0 auto!important;
    margin-right:0!important;
  }
  html.kn-mobile-header .header--icons-list .kn-locale-icon-item .kn-iframe-locale{
    display:inline-flex!important;
    align-items:center!important;
    gap:0!important;
    flex:0 0 auto!important;
  }
  html.kn-mobile-header .header--icons-list .kn-locale-icon-item .kn-iframe-locale button{
    width:26px!important;
    height:26px!important;
    min-width:26px!important;
    padding:0!important;
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    font-size:9px!important;
    font-weight:700!important;
    line-height:1!important;
    color:#111!important;
    background:transparent!important;
  }
  html.kn-mobile-header .header--icons-list .kn-locale-icon-item .kn-iframe-locale button.is-active{
    background:#111!important;
    border-radius:4px!important;
    color:#fff!important;
  }
  html.kn-mobile-header .header--icons-list .header--icon-link-text{
    width:32px!important;
    height:32px!important;
    min-width:32px!important;
    min-height:32px!important;
  }
  html.kn-mobile-header .header--icons-list>.header--icon-item.account,
  html.kn-mobile-header .header--icons-list .header--icon-item.account{
    display:flex!important;
    visibility:visible!important;
    flex:0 0 auto!important;
  }
}
`;

export function buildHeaderMobileFitScript(): string {
  return `(function(){
var BP=${MOBILE_BP};
var LOGO_H=${LOGO_MAX_H};
if(window.matchMedia("(max-width:"+BP+"px)").matches){document.documentElement.classList.add("kn-mobile-header");}
function mob(){return window.matchMedia("(max-width:"+BP+"px)").matches;}
function fitImg(img,boxW,boxH){
  if(!img)return;
  img.style.objectFit="contain";
  img.style.objectPosition="left center";
  img.style.maxWidth="100%";
  img.style.maxHeight=boxH+"px";
  var nw=img.naturalWidth||0;
  var nh=img.naturalHeight||0;
  if(nw>0&&nh>0){
    var r=nw/nh;
    var h=Math.min(boxH,boxW/r);
    var w=h*r;
    if(w>boxW){w=boxW;h=w/r;}
    img.style.width=Math.round(w)+"px";
    img.style.height=Math.round(h)+"px";
  }else{
    img.style.width="auto";
    img.style.height="auto";
  }
}
function fit(){
  var root=document.documentElement;
  if(!mob()){
    root.classList.remove("kn-mobile-header");
    var logo0=document.querySelector(".header--logo");
    if(logo0){logo0.style.maxWidth="";logo0.style.width="";}
    return;
  }
  root.classList.add("kn-mobile-header");
  var wrap=document.querySelector(".header--wrapper");
  var logo=document.querySelector(".header--logo");
  var right=document.querySelector(".header--right");
  var menu=document.querySelector("[data-mobile-toggler],.mobile-toggler,.hamburger--toggler");
  if(!wrap||!logo||!right)return;
  var gap=4;
  var reserved=(menu?menu.getBoundingClientRect().width:40)+right.getBoundingClientRect().width+gap;
  var boxW=Math.max(32,Math.floor(wrap.clientWidth-reserved));
  logo.style.maxWidth=boxW+"px";
  logo.style.width=boxW+"px";
  logo.style.minWidth="0";
  logo.style.overflow="hidden";
  var img=logo.querySelector("img.header--logo-img:not(.transparent-logo-img)");
  fitImg(img,boxW,LOGO_H);
  var light=logo.querySelector("img.transparent-logo-img");
  fitImg(light,boxW,LOGO_H);
}
var t;
function sched(){clearTimeout(t);t=setTimeout(fit,16);}
function boot(){
  fit();
  window.addEventListener("resize",sched,{passive:true});
  window.addEventListener("orientationchange",sched,{passive:true});
  var wrap=document.querySelector(".header--wrapper");
  if(wrap&&typeof ResizeObserver!=="undefined"){
    try{new ResizeObserver(sched).observe(wrap);}catch(e){}
  }
  var logo=document.querySelector(".header--logo");
  if(logo&&typeof MutationObserver!=="undefined"){
    try{
      new MutationObserver(sched).observe(logo,{subtree:true,attributes:true,attributeFilter:["src","srcset","style"]});
    }catch(e){}
  }
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(fit).catch(function(){});}
  var logoImg=document.querySelector(".header--logo img.header--logo-img:not(.transparent-logo-img)");
  if(logoImg&&!logoImg.complete)logoImg.addEventListener("load",fit,{once:true});
  else if(logoImg&&logoImg.complete)fit();
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
