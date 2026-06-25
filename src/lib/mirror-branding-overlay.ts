/** Mirror iframe — admin logo / favicon (tema JS üzerine yazsa bile korunur) */

import { withBrandAssetVersion } from "@/lib/site-settings-branding";

export type MirrorBranding = {
  logoUrl: string;
  logoUrlLight: string;
  faviconUrl: string;
};

const FALLBACK_DARK = "/theme/techizmet-shop/cdn/shop/files/noor-dark-logo34d3.svg";
const FALLBACK_LIGHT = "/theme/techizmet-shop/cdn/shop/files/noor-white-logo34d3.svg";

function bust(url: string): string {
  return withBrandAssetVersion(url);
}

function pathOf(url: string) {
  return url.split("?")[0] ?? url;
}

function setImgSrc(img: HTMLImageElement, url: string, fallback: string) {
  const next = bust(url);
  const path = pathOf(next);
  const srcset = `${next} 1x, ${next} 2x`;
  const curSrc = pathOf(img.getAttribute("src") ?? "");
  const curSet = img.getAttribute("srcset") ?? "";

  if (curSrc === path && curSet.includes(path)) return;

  img.removeAttribute("data-src");
  img.removeAttribute("width");
  img.removeAttribute("height");
  img.onerror = () => {
    const fb = bust(fallback);
    if (fallback && pathOf(img.src) !== pathOf(fb)) {
      img.onerror = null;
      setImgSrc(img, fallback, "");
      return;
    }
    img.style.visibility = "hidden";
  };

  img.src = next;
  img.setAttribute("srcset", srcset);
  img.dataset.knBrand = path;
}

export function setMirrorFavicon(doc: Document, url: string) {
  const href = bust(url);
  for (const rel of ["icon", "shortcut icon", "apple-touch-icon"]) {
    let link = doc.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!link) {
      link = doc.createElement("link");
      link.rel = rel;
      doc.head.appendChild(link);
    }
    link.href = href;
  }
}

/** Tek seferlik DOM yaması */
export function applyMirrorBranding(doc: Document, branding: MirrorBranding) {
  const dark = branding.logoUrl?.trim();
  const light = branding.logoUrlLight?.trim() || dark;
  const favicon = branding.faviconUrl?.trim();

  if (dark) {
    doc.querySelectorAll("img.header--logo-img:not(.transparent-logo-img)").forEach((el) => {
      if (el instanceof HTMLImageElement) setImgSrc(el, dark, FALLBACK_DARK);
    });
  }

  if (light) {
    doc
      .querySelectorAll("img.header--logo-img.transparent-logo-img, img.transparent-logo-img, img.footer--logo-img")
      .forEach((el) => {
        if (el instanceof HTMLImageElement) setImgSrc(el, light, FALLBACK_LIGHT);
      });
    doc.querySelectorAll('link[rel="preload"][as="image"]').forEach((el) => {
      if (el instanceof HTMLLinkElement && /logo/i.test(el.href)) el.href = bust(light);
    });
  }

  if (favicon) setMirrorFavicon(doc, favicon);
}

export function installMirrorFaviconGuard(doc: Document, faviconUrl: string) {
  const id = "kn-favicon-guard-script";
  if (doc.getElementById(id)) return;
  const href = bust(faviconUrl);
  const script = doc.createElement("script");
  script.id = id;
  script.textContent = `(function(){var U=${JSON.stringify(href)};function apply(){["icon","shortcut icon","apple-touch-icon"].forEach(function(rel){var link=document.querySelector('link[rel="'+rel+'"]');if(!link){link=document.createElement("link");link.rel=rel;document.head.appendChild(link);}if(link.href.indexOf(U.split("?")[0])<0)link.href=U;});}apply();var t=0;new MutationObserver(function(){if(Date.now()-t<80)return;t=Date.now();apply();}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["href"]});})();`;
  (doc.body ?? doc.head).appendChild(script);
}

const GUARD_SCRIPT_ID = "kn-branding-guard-script";

/** Tema scriptleri src’yi geri alırsa yeniden uygular */
export function installMirrorBrandingGuard(doc: Document, branding: MirrorBranding) {
  if (!branding.logoUrl?.trim() && !branding.faviconUrl?.trim()) return;
  if (doc.getElementById(GUARD_SCRIPT_ID)) return;

  const payload = JSON.stringify({
    logo: branding.logoUrl?.trim() ?? "",
    light: branding.logoUrlLight?.trim() || branding.logoUrl?.trim() || "",
    favicon: branding.faviconUrl?.trim() ?? "",
    fallbackDark: FALLBACK_DARK,
    fallbackLight: FALLBACK_LIGHT,
  });

  const script = doc.createElement("script");
  script.id = GUARD_SCRIPT_ID;
  script.textContent = `(function(){
  var P=${payload};
  function bust(u){if(!u)return u;var p=(u.split("?")[0]||"").replace(/[^\\w-]/g,"").slice(-32)||"1";var s=u.replace(/([?&])(v|kn)=[^&]*/g,"").replace(/[?&]$/,"");return s+(s.indexOf("?")>=0?"&":"?")+"v="+p;}
  function pathOf(u){return (u||"").split("?")[0];}
  function setImg(img,url,fallback){
    if(!url||!img)return;
    var n=bust(url);
    var p=pathOf(n);
    var set=img.getAttribute("srcset")||"";
    if(pathOf(img.getAttribute("src")||"")===p&&set.indexOf(p)>=0)return;
    var fb=fallback?bust(fallback):"";
    img.removeAttribute("data-src");
    img.removeAttribute("width");
    img.removeAttribute("height");
    img.onerror=function(){
      if(fb&&pathOf(img.src)!==pathOf(fb)){img.onerror=null;setImg(img,fallback,"");return;}
      img.style.visibility="hidden";
    };
    img.src=n;
    img.setAttribute("srcset",n+" 1x, "+n+" 2x");
    img.dataset.knBrand=p;
  }
  function apply(){
    var unified=!!document.querySelector("[id^=kn-logo-unify-script]")||document.documentElement.dataset.knLogoUnifyWatch==="1";
    if(!unified&&P.logo) document.querySelectorAll("img.header--logo-img:not(.transparent-logo-img)").forEach(function(el){setImg(el,P.logo,P.fallbackDark);});
    if(P.light) document.querySelectorAll(unified?"img.footer--logo-img":"img.header--logo-img.transparent-logo-img,img.transparent-logo-img,img.footer--logo-img").forEach(function(el){setImg(el,P.light,P.fallbackLight);});
    if(P.favicon) ["icon","shortcut icon","apple-touch-icon"].forEach(function(rel){
      var link=document.querySelector('link[rel="'+rel+'"]');
      if(!link){link=document.createElement("link");link.rel=rel;document.head.appendChild(link);}
      link.href=bust(P.favicon);
    });
    if(!unified) document.querySelectorAll('link[rel="preload"][as="image"]').forEach(function(l){
      if(/logo/i.test(l.href)) l.href=bust(P.light||P.logo);
    });
  }
  apply();
  var t=0;
  new MutationObserver(function(){
    if(document.querySelector("[id^=kn-logo-unify-script]")||document.documentElement.dataset.knLogoUnifyWatch==="1") return;
    if(Date.now()-t<80)return;
    t=Date.now();
    apply();
  }).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["src","srcset","href"]});
})();`;
  (doc.body ?? doc.head).appendChild(script);
}
