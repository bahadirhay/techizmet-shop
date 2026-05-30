import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Minimal copy of injectBrandingIntoMirrorHtml logic
const NOOR_DARK = /\/theme\/techizmet-shop\/cdn\/shop\/files\/noor-dark-logo[^"'\s]*/gi;
const NOOR_WHITE = /\/theme\/techizmet-shop\/cdn\/shop\/files\/noor-white-logo[^"'\s]*/gi;

function escAttr(url) {
  return url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function logoSrcset(url) {
  const u = escAttr(url);
  return `${u} 1x, ${u} 2x`;
}
function patchMirrorLogoImgTags(html, dark, light) {
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
function patchLogoPreloads(html, dark, light) {
  const lightUrl = light || dark;
  return html.replace(
    /<link([^>]*rel=["']preload["'][^>]*as=["']image["'][^>]*href=["'])([^"']*noor-(?:white|dark)-logo[^"']*)(["'][^>]*>)/gi,
    (_m, pre, _href, post) => `<link${pre}${escAttr(lightUrl)}${post}`,
  );
}

const html = await readFile("public/theme/techizmet-shop/mirror/index-tr.html", "utf8");
const dark = "/theme/techizmet-shop/cdn/shop/files/noor-dark-logo34d3.svg";
const light = "/theme/techizmet-shop/cdn/shop/files/noor-white-logo34d3.svg";

let out = html;
out = out.replace(NOOR_DARK, dark);
out = out.replace(NOOR_WHITE, light);
out = patchMirrorLogoImgTags(out, dark, light);
out = patchLogoPreloads(out, dark, light);

const broken = out.match(/\s+rel="preload" as="image"/);
console.log("broken after branding:", !!broken);
if (broken) {
  const idx = out.indexOf(' rel="preload" as="image"');
  console.log(out.slice(idx - 150, idx + 200));
}

// step by step
let s = html;
s = s.replace(NOOR_DARK, dark);
s = s.replace(NOOR_WHITE, light);
const afterUrl = s.match(/\s+rel="preload" as="image"/);
console.log("after URL replace broken:", !!afterUrl);

s = patchMirrorLogoImgTags(s, dark, light);
s = patchLogoPreloads(s, dark, light);
const brokenLink = s.match(/\n\s+rel="preload" as="image"/);
console.log("after preload patch missing <link:", !!brokenLink);
if (brokenLink) {
  const idx = s.indexOf('\n               rel="preload"');
  console.log("context:", s.slice(idx - 100, idx + 200));
}
