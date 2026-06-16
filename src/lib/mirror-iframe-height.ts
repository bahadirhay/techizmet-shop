/** Mirror iframe — içerik yüksekliği (footer sonu; overlay/popup hariç) */

export function measureMirrorIframeContentHeight(doc: Document): number | null {
  if (doc.querySelector("product-media-popup.show, .product-media-popup.show")) {
    return null;
  }

  const footer =
    doc.querySelector<HTMLElement>("footer.section-footer") ??
    doc.querySelector<HTMLElement>(".kn-section-group-footer-group.section-footer") ??
    doc.querySelector<HTMLElement>(".section-footer");

  if (footer) {
    const docEl = doc.documentElement;
    const top = docEl.getBoundingClientRect().top;
    const bottom = footer.getBoundingClientRect().bottom;
    return Math.ceil(bottom - top + docEl.scrollTop);
  }

  const h = Math.max(
    doc.documentElement.scrollHeight,
    doc.documentElement.offsetHeight,
    doc.body.scrollHeight,
    doc.body.offsetHeight,
  );
  return Number.isFinite(h) && h > 0 ? Math.ceil(h) : null;
}
