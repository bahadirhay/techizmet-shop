import type { MirrorBranding } from "@/lib/mirror-branding-overlay";

export const LOGO_UNIFY_VERSION = 4;
const STYLE_ID = "kn-logo-unify-final";
const SCRIPT_ID = "kn-logo-unify-script";

/** Tema header38c6.css body'de yüklendiği için kritik kurallar body sonunda */
export const LOGO_UNIFY_CSS = `
.section-header,sticky-always.header,sticky-on-scroll.header{--logo_width:320px!important}
@media(max-width:991px){
.section-header,sticky-always.header,sticky-on-scroll.header{--logo_width:min(112px,calc(100vw - 12.75rem))!important}
.header--logo{
  max-width:100%!important;min-width:0!important;flex-shrink:1!important;min-height:44px!important;margin:2px 0!important;
}
.header--logo .header--logo-img:not(.transparent-logo-img),
.header--logo img.header--logo-img:not(.transparent-logo-img){
  max-height:44px!important;height:44px!important;max-width:100%!important;
}
}
.header--logo{
  position:relative!important;display:inline-flex!important;align-items:center!important;
  justify-content:flex-start!important;width:auto!important;max-width:min(var(--logo_width,320px),50vw)!important;
  min-height:56px!important;margin:6px 0!important;flex-shrink:0!important;background:transparent!important;
}
.header--logo .header--logo-img:not(.transparent-logo-img),
.header--logo img.header--logo-img:not(.transparent-logo-img){
  position:relative!important;top:auto!important;left:auto!important;inset:auto!important;
  display:block!important;width:auto!important;height:56px!important;max-height:56px!important;
  max-width:min(var(--logo_width,320px),50vw)!important;
  object-fit:contain!important;object-position:left center!important;background:transparent!important;
}
.header--logo .transparent-logo-img,
.header--logo img.transparent-logo-img{
  position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;
  max-width:none!important;object-fit:contain!important;object-position:left center!important;
  display:block!important;background:transparent!important;
}
.header.desktop-transparent.is-sticky:not(.style-half-width-menu):before,
.header.mobile-transparent.is-sticky:before{
  opacity:1!important;transition:opacity .35s cubic-bezier(.104,.204,.492,1) 0s!important;
}
`;

export function pickHeaderLogoUrl(
  header: Element | null,
  branding: MirrorBranding,
): string {
  const dark = branding.logoUrl?.trim() ?? "";
  const light = branding.logoUrlLight?.trim() || dark;
  if (!dark) return light;
  if (!header) return dark;
  const transparent =
    header.classList.contains("desktop-transparent") || header.classList.contains("mobile-transparent");
  const sticky = header.classList.contains("is-sticky");
  return transparent && !sticky ? light : dark;
}

function bustUrl(url: string) {
  return url + (url.includes("?") ? "&" : "?") + "kn=1";
}

function applyLogoImgSize(img: HTMLImageElement) {
  img.removeAttribute("width");
  img.removeAttribute("height");
  img.style.width = "auto";
  img.style.height = "56px";
  img.style.maxHeight = "56px";
  img.style.objectFit = "contain";
  img.style.background = "transparent";
}

function setLogoImgSrc(img: HTMLImageElement, url: string) {
  const next = bustUrl(url);
  const curPath = (img.getAttribute("src") ?? "").split("?")[0];
  const nextPath = next.split("?")[0];
  if (curPath === nextPath) return;
  img.src = next;
  img.setAttribute("srcset", `${next} 1x, ${next} 2x`);
}

/** Çift logo — tema opacity geçişi; scroll sırasında src değiştirme yok (beyaz flaş önlenir) */
export function runMirrorLogoUnify(doc: Document, branding: MirrorBranding) {
  if (!branding.logoUrl?.trim()) return;

  if (!doc.getElementById(STYLE_ID)) {
    const st = doc.createElement("style");
    st.id = STYLE_ID;
    st.textContent = LOGO_UNIFY_CSS;
    doc.body.appendChild(st);
  }

  const dark = branding.logoUrl.trim();
  const light = branding.logoUrlLight?.trim() || dark;

  const darkImg = doc.querySelector(
    ".header--logo img.header--logo-img:not(.transparent-logo-img)",
  ) as HTMLImageElement | null;
  if (!darkImg) return;

  applyLogoImgSize(darkImg);
  setLogoImgSrc(darkImg, dark);

  const lightImg = doc.querySelector(
    ".header--logo img.transparent-logo-img",
  ) as HTMLImageElement | null;
  if (lightImg) {
    applyLogoImgSize(lightImg);
    setLogoImgSrc(lightImg, light);
  }
}

export function installMirrorLogoUnifyWatch(doc: Document, branding: MirrorBranding) {
  if (!branding.logoUrl?.trim()) return;
  if ((doc.documentElement as HTMLElement).dataset.knLogoUnifyWatch === "1") return;
  doc.documentElement.dataset.knLogoUnifyWatch = "1";
  runMirrorLogoUnify(doc, branding);
}

export function buildLogoUnifyScript(branding: MirrorBranding): string {
  const payload = JSON.stringify({
    dark: branding.logoUrl?.trim() ?? "",
    light: branding.logoUrlLight?.trim() || branding.logoUrl?.trim() || "",
    v: LOGO_UNIFY_VERSION,
  });
  return `(function(){
var P=${payload};
function bust(u){return u?(u+(u.indexOf("?")>=0?"&":"?")+"kn=1"):"";}
function size(img){if(!img)return;img.removeAttribute("width");img.removeAttribute("height");img.style.width="auto";img.style.height="56px";img.style.maxHeight="56px";img.style.objectFit="contain";img.style.background="transparent";}
function setSrc(img,u){if(!img||!u)return;var n=bust(u);if((img.getAttribute("src")||"").split("?")[0]===n.split("?")[0])return;img.src=n;img.setAttribute("srcset",n+" 1x, "+n+" 2x");}
function apply(){var dark=document.querySelector(".header--logo img.header--logo-img:not(.transparent-logo-img)");var light=document.querySelector(".header--logo img.transparent-logo-img");if(!dark||!P.dark)return;size(dark);setSrc(dark,P.dark);if(light){size(light);setSrc(light,P.light||P.dark);}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply);else apply();
})();`;
}

/** Header içindeki ikinci (transparent) logo img */
export function removeHeaderTransparentLogo(html: string): string {
  return html.replace(
    /(<a\b[\s\S]*?\bclass="header--logo"[\s\S]*?>)([\s\S]*?)(<\/a>)/gi,
    (_m, open, inner, close) => {
      let next = inner.replace(/<link\b[^>]*\brel=["']preload["'][^>]*\bas=["']image["'][^>]*>/gi, (link: string) =>
        /transparent-logo|noor-white-logo/i.test(link) ? "" : link,
      );
      next = next.replace(/<img\b[^>]*\btransparent-logo-img\b[^>]*>\s*/gi, "");
      return `${open}${next}${close}`;
    },
  );
}

export function patchMirrorLogoDimensions(html: string): string {
  let out = html.replace(/--logo_width:\s*90px/gi, "--logo_width: 320px");
  out = out.replace(/--logo_width:\s*70px/gi, "--logo_width: 240px");
  out = out.replace(
    /(<img\b[^>]*\bclass="[^"]*(?:header--logo-img|transparent-logo-img)[^"]*"[^>]*)\s+width="[^"]*"/gi,
    "$1",
  );
  out = out.replace(
    /(<img\b[^>]*\bclass="[^"]*(?:header--logo-img|transparent-logo-img)[^"]*"[^>]*)\s+height="[^"]*"/gi,
    "$1",
  );
  return out;
}

export function injectMirrorLogoUnify(html: string, branding?: MirrorBranding): string {
  let out = patchMirrorLogoDimensions(html);
  const styleTag = `<style id="${STYLE_ID}">${LOGO_UNIFY_CSS}</style>`;
  if (!out.includes(STYLE_ID)) {
    out = out.replace(/<\/body>/i, `${styleTag}\n</body>`);
  }
  const scriptId = `${SCRIPT_ID}-v${LOGO_UNIFY_VERSION}`;
  if (branding?.logoUrl?.trim() && !out.includes(scriptId)) {
    out = out.replace(
      /<\/body>/i,
      `<script id="${scriptId}">${buildLogoUnifyScript(branding)}</script>\n</body>`,
    );
  }
  return out;
}

/** iframe istemci — sunucu HTML olsa bile her zaman çalıştır */
export function applyMirrorLogoUnify(doc: Document, branding: MirrorBranding) {
  runMirrorLogoUnify(doc, branding);
  installMirrorLogoUnifyWatch(doc, branding);
}
