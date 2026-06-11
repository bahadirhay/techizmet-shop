/** Mirror HTML — tema çakışma düzeltmeleri (store-ui-fixes.css) */

import { patchMirrorLogoDimensions } from "@/lib/mirror-logo-unify";

const FIXES_CSS_VERSION = 20;
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
