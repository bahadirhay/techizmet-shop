import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import { resolveMirrorIframeSrc } from "@/lib/mirror-prebuilt";

const NOOR_DARK = /\/theme\/techizmet-shop\/cdn\/shop\/files\/noor-dark-logo[^"'\s]*/gi;
const NOOR_WHITE = /\/theme\/techizmet-shop\/cdn\/shop\/files\/noor-white-logo[^"'\s]*/gi;

const FALLBACK_DARK = "/theme/techizmet-shop/cdn/shop/files/noor-dark-logo34d3.svg";
const FALLBACK_LIGHT = "/theme/techizmet-shop/cdn/shop/files/noor-white-logo34d3.svg";

function escAttr(url: string) {
  return url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function logoSrcset(url: string) {
  const u = escAttr(url);
  return `${u} 1x, ${u} 2x`;
}

/** Header/footer logo img — src + srcset (tarayıcı srcset’i src’den önce kullanabilir) */
function patchMirrorLogoImgTags(html: string, dark: string, light: string): string {
  const lightUrl = light || dark;
  const logoImgRe =
    /<img\b([^>]*\bclass="[^"]*(?:header--logo-img|footer--logo-img|transparent-logo-img)[^"]*"[^>]*)>/gi;

  return html.replace(logoImgRe, (tag, attrs) => {
    const isLight = /\btransparent-logo-img\b/.test(attrs) || /\bfooter--logo-img\b/.test(attrs);
    const url = isLight ? lightUrl : dark;
    let next = attrs.replace(/\s+srcset="[^"]*"/i, "");
    next = next.replace(/\s+src="[^"]*"/i, "");
    return `<img${next} src="${escAttr(url)}" srcset="${logoSrcset(url)}">`;
  });
}

function patchLogoPreloads(html: string, dark: string, light: string): string {
  const lightUrl = light || dark;
  return html.replace(
    /<link([^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*href=["'])([^"']*noor-(?:white|dark)-logo[^"']*)(["'][^>]*>)/gi,
    (_m, pre, _href, post) => `<link${pre}${escAttr(lightUrl)}${post}`,
  );
}

/** Mirror HTML — Techizmet Shop gömülü logo URL’lerini admin markası ile değiştirir (ilk boyamada flaş yok) */
export function injectBrandingIntoMirrorHtml(html: string, branding: MirrorBranding): string {
  const dark = branding.logoUrl?.trim();
  const light = branding.logoUrlLight?.trim() || dark;
  const favicon = branding.faviconUrl?.trim();

  let out = html;

  if (dark) {
    const lightUrl = light ?? dark;
    out = out.replace(NOOR_DARK, dark);
    out = out.replace(NOOR_WHITE, lightUrl);
    out = patchMirrorLogoImgTags(out, dark, lightUrl);
    out = patchLogoPreloads(out, dark, lightUrl);

    if (dark === lightUrl) {
      const dedupeStyle = `<style id="kn-logo-dedupe">.header--logo .transparent-logo-img{display:none!important}.header:not(.is-sticky).desktop-transparent:not(:hover) .header--logo-img:not(.transparent-logo-img),.header:not(.is-sticky).mobile-transparent:not(:hover) .header--logo-img:not(.transparent-logo-img){opacity:1!important}</style>`;
      out = out.replace(/<\/head>/i, `${dedupeStyle}\n</head>`);
    }
  }

  if (favicon) {
    out = out.replace(
      /<link([^>]*rel=["'](?:shortcut )?icon["'][^>]*)>/gi,
      `<link$1 href="${escAttr(favicon)}">`,
    );
  }

  const bootstrap = buildHeadBootstrap(branding);
  if (out.includes("<head>")) {
    out = out.replace(/<head>/i, `<head>${bootstrap}`);
  } else if (out.includes("<head ")) {
    out = out.replace(/<head\s[^>]*>/i, (m) => `${m}${bootstrap}`);
  }

  return out;
}

function buildHeadBootstrap(branding: MirrorBranding): string {
  const payload = JSON.stringify({
    logo: branding.logoUrl?.trim() ?? "",
    light: branding.logoUrlLight?.trim() || branding.logoUrl?.trim() || "",
    favicon: branding.faviconUrl?.trim() ?? "",
    fallbackDark: FALLBACK_DARK,
    fallbackLight: FALLBACK_LIGHT,
  });
  return `<script id="kn-branding-bootstrap">(function(){var P=${payload};function bust(u){if(!u)return u;return u+(u.indexOf("?")>=0?"&":"?")+"kn=1";}function pathOf(u){return(u||"").split("?")[0];}function set(el,u,fallback){if(!el||!u)return;var n=bust(u);var fb=fallback?bust(fallback):"";el.removeAttribute("data-src");el.onerror=function(){if(fb&&pathOf(el.src)!==pathOf(fb)){el.onerror=null;set(el,fb,"");return;}el.style.visibility="hidden";};el.src=n;el.setAttribute("srcset",n+" 1x, "+n+" 2x");}function apply(){if(P.logo)document.querySelectorAll("img.header--logo-img:not(.transparent-logo-img)").forEach(function(el){set(el,P.logo,P.fallbackDark);});if(P.light)document.querySelectorAll("img.transparent-logo-img,img.footer--logo-img").forEach(function(el){set(el,P.light,P.fallbackLight);});if(P.favicon)["icon","shortcut icon","apple-touch-icon"].forEach(function(r){var l=document.querySelector('link[rel="'+r+'"]');if(!l){l=document.createElement("link");l.rel=r;document.head.appendChild(l);}l.href=bust(P.favicon);});document.querySelectorAll('link[rel="preload"][as="image"]').forEach(function(l){if(/logo/i.test(l.href))l.href=bust(P.light||P.logo);});}function boot(){apply();var moScheduled=false;new MutationObserver(function(){if(moScheduled)return;moScheduled=true;requestAnimationFrame(function(){moScheduled=false;apply();});}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:["src","srcset","href"]});}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();})();</script>`;
}

/** /theme/techizmet-shop/mirror/... → statik prebuilt veya markalı API */
export function toBrandedMirrorSrc(
  publicPath: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  const path = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  return resolveMirrorIframeSrc(path, pageKey, extra);
}
