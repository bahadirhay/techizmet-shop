/** Mirror HTML — tema çakışma düzeltmeleri (store-ui-fixes.css) */

const FIXES_CSS_HREF = "/theme/king-noor/store-ui-fixes.css?v=6";

export function injectMirrorStoreUiFix(html: string): string {
  if (html.includes("store-ui-fixes.css")) {
    return html.replace(/store-ui-fixes\.css\?v=\d+/g, "store-ui-fixes.css?v=6");
  }
  const link = `<link rel="stylesheet" href="${FIXES_CSS_HREF}" id="kn-store-ui-fixes" />`;
  return html.replace(/<\/head>/i, `${link}\n</head>`);
}
