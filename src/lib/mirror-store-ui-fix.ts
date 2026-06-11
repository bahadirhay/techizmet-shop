/** Mirror HTML — tema çakışma düzeltmeleri (store-ui-fixes.css) */

import { patchMirrorLogoDimensions } from "@/lib/mirror-logo-unify";

const FIXES_CSS_VERSION = 21;
const FIXES_CSS_HREF = `/theme/techizmet-shop/store-ui-fixes.css?v=${FIXES_CSS_VERSION}`;

export function patchMirrorLogoSize(html: string): string {
  return patchMirrorLogoDimensions(html);
}

export function injectMirrorStoreUiFix(html: string): string {
  let out = patchMirrorLogoSize(html);
  if (out.includes("store-ui-fixes.css")) {
    return out.replace(/store-ui-fixes\.css\?v=\d+/g, FIXES_CSS_HREF);
  }
  const link = `<link rel="stylesheet" href="${FIXES_CSS_HREF}" id="kn-store-ui-fixes" />`;
  return out.replace(/<\/head>/i, `${link}\n</head>`);
}

/** iframe — eski prebuild CSS sürümünü günceller */
export function applyMirrorStoreUiFixToDocument(doc: Document) {
  const link =
    (doc.getElementById("kn-store-ui-fixes") as HTMLLinkElement | null) ??
    (doc.querySelector('link[href*="store-ui-fixes.css"]') as HTMLLinkElement | null);
  if (link) {
    link.href = FIXES_CSS_HREF;
    return;
  }
  const el = doc.createElement("link");
  el.rel = "stylesheet";
  el.href = FIXES_CSS_HREF;
  el.id = "kn-store-ui-fixes";
  doc.head.appendChild(el);
}
