/** Mirror iframe — no-js-hidden / lazyload görselleri görünür yap (Shopify JS yok) */

export function resolveMirrorImageUrl(img: HTMLImageElement): string | null {
  for (const raw of [img.getAttribute("data-original"), img.getAttribute("data-src"), img.src]) {
    const url = raw?.trim();
    if (!url || url.includes("{width}")) continue;
    return url;
  }
  return null;
}

export function revealMirrorImageElement(img: HTMLImageElement) {
  const url = resolveMirrorImageUrl(img);
  img.classList.remove("no-js-hidden", "lazyload", "lazyloading");
  img.classList.add("lazyloaded");
  img.removeAttribute("loading");
  if (url) {
    img.src = url;
    img.setAttribute("data-src", url);
    img.setAttribute("data-original", url);
  }
}

export const MIRROR_EMBED_HERO_CRITICAL_CSS = `
html.kn-mirror-embed #MainContent > .section-media-grid:first-of-type {
  --desktop_height: 300px !important;
  --mobile_height: 200px !important;
}
html.kn-mirror-embed .section-media-grid:first-of-type .media-grid--image {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
html.kn-mirror-embed .section-media-grid:first-of-type .media-grid--image .media,
html.kn-mirror-embed .section-media-grid:first-of-type .media-grid--image .media-fixed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
html.kn-mirror-embed .section-media-grid:first-of-type img.media_image {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: cover !important;
}
`;

export function markMirrorEmbedRoot(doc: Document) {
  doc.documentElement.classList.add("kn-mirror-embed");
  if (!doc.getElementById("kn-mirror-embed-critical")) {
    const style = doc.createElement("style");
    style.id = "kn-mirror-embed-critical";
    style.textContent = MIRROR_EMBED_HERO_CRITICAL_CSS;
    doc.head.appendChild(style);
  }
}

export function revealMirrorImagesInDocument(doc: Document) {
  markMirrorEmbedRoot(doc);
  doc.querySelectorAll('img.no-js-hidden, img.lazyload, img[lazyload], img.media_image').forEach((node) => {
    if (node instanceof HTMLImageElement) revealMirrorImageElement(node);
  });
}

/** Sunucu / prebuild — img class listesinden no-js-hidden kaldır */
export function patchMirrorNoJsHiddenImagesHtml(html: string): string {
  return html.replace(/(<img\b[^>]*\bclass=")([^"]*)(")/gi, (full, pre, classes: string, post) => {
    if (!/\bno-js-hidden\b/.test(classes) && !/\blazyload\b/.test(classes)) return full;
    const next = classes
      .replace(/\bno-js-hidden\b/g, "")
      .replace(/\blazyload\b/g, "lazyloaded")
      .replace(/\s+/g, " ")
      .trim();
    return `${pre}${next}${post}`;
  });
}

export const MIRROR_IMAGE_REVEAL_CSS = `
img.no-js-hidden,
img.media_image,
.section-media-grid img {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
`;
