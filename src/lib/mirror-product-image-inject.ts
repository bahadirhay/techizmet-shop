export const PRODUCT_IMAGE_CSS = "/theme/techizmet-shop/kn-product-images.css?v=2";

/** İstemci — prebuild iframe’lere ürün görsel oranı (1200×1800) */
export function ensureMirrorProductImageStyles(doc: Document) {
  const head = doc.head;
  if (!head) return;
  const existing = doc.getElementById("kn-product-images-css") as HTMLLinkElement | null;
  if (existing) {
    existing.href = PRODUCT_IMAGE_CSS;
    return;
  }
  const link = doc.createElement("link");
  link.id = "kn-product-images-css";
  link.rel = "stylesheet";
  link.href = PRODUCT_IMAGE_CSS;
  head.appendChild(link);
}

/** Mirror iframe — ürün görsel oranı (1200×1800) */
export function injectMirrorProductImageStyles(html: string): string {
  if (html.includes("kn-product-images.css")) {
    return html.replace(/kn-product-images\.css\?v=\d+/g, "kn-product-images.css?v=2");
  }
  if (html.includes('id="kn-product-images-css"')) return html;
  const link = `<link rel="stylesheet" href="${PRODUCT_IMAGE_CSS}" id="kn-product-images-css" />`;
  return html.replace(/<\/head>/i, `${link}\n</head>`);
}
