/** Mirror iframe — no-js-hidden / lazyload görselleri görünür yap (Shopify JS yok) */

import {
  MIRROR_CARD_IMAGE_WIDTH,
  MIRROR_HERO_TILE_WIDTH,
  MIRROR_LCP_IMAGE_WIDTH,
  mirrorCdnImageUrl,
} from "@/lib/mirror-cdn-image";

export function resolveMirrorImageUrl(img: HTMLImageElement): string | null {
  for (const raw of [img.getAttribute("data-original"), img.getAttribute("data-src"), img.src]) {
    const url = raw?.trim();
    if (!url || url.includes("{width}")) continue;
    return url;
  }
  return null;
}

function isProductOrListingCard(img: HTMLImageElement): boolean {
  if (img.classList.contains("product--card-image") || img.classList.contains("collection--card-image")) {
    return true;
  }
  return Boolean(img.closest(".main-collection--products-list, .product--card, .collections-tab--products"));
}

function isFirstHeroLcpImage(img: HTMLImageElement, doc: Document): boolean {
  const firstSection = doc.querySelector("#MainContent > .section-media-grid:first-of-type, .section-media-grid:first-of-type");
  if (!firstSection?.contains(img)) return false;
  const firstImg = firstSection.querySelector("img.media_image, img");
  return img === firstImg;
}

export type RevealMirrorImageOpts = {
  width?: number;
  highPriority?: boolean;
  keepLazy?: boolean;
};

export function revealMirrorImageElement(img: HTMLImageElement, opts?: RevealMirrorImageOpts) {
  const rawUrl = resolveMirrorImageUrl(img);
  const width = opts?.width ?? MIRROR_HERO_TILE_WIDTH;
  const sizedUrl = rawUrl ? mirrorCdnImageUrl(rawUrl, width) : null;

  img.classList.remove("no-js-hidden", "lazyload", "lazyloading");
  img.classList.add("lazyloaded");

  if (opts?.highPriority) {
    img.setAttribute("fetchpriority", "high");
    img.removeAttribute("loading");
  } else if (opts?.keepLazy) {
    img.setAttribute("loading", "lazy");
    img.removeAttribute("fetchpriority");
  } else {
    img.removeAttribute("loading");
  }

  if (sizedUrl) {
    img.src = sizedUrl;
    img.setAttribute("data-src", sizedUrl);
    if (rawUrl) img.setAttribute("data-original", rawUrl);
  }
}

function revealDeferredListingImage(img: HTMLImageElement) {
  const rawUrl = resolveMirrorImageUrl(img);
  img.classList.remove("no-js-hidden", "lazyload", "lazyloading");
  img.classList.add("lazyloaded");
  if (!img.getAttribute("loading")) img.setAttribute("loading", "lazy");
  img.removeAttribute("fetchpriority");

  if (!rawUrl) return;
  const sized = mirrorCdnImageUrl(rawUrl, MIRROR_CARD_IMAGE_WIDTH);
  img.setAttribute("data-src", sized);
  img.setAttribute("data-original", rawUrl);
  const current = img.src?.trim() ?? "";
  if (!current || current.includes("width=250") || current === rawUrl) {
    img.src = sized;
  }
}

const LAZY_REVEAL_OBSERVER_KEY = "__knMirrorLazyRevealObserver";

function ensureLazyRevealObserver(doc: Document): IntersectionObserver | null {
  const win = doc.defaultView;
  if (!win || typeof win.IntersectionObserver !== "function") return null;

  const store = win as unknown as Record<string, IntersectionObserver | undefined>;
  if (store[LAZY_REVEAL_OBSERVER_KEY]) return store[LAZY_REVEAL_OBSERVER_KEY]!;

  const observer = new win.IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target;
        if (!(img instanceof HTMLImageElement)) continue;
        revealMirrorImageElement(img, { width: MIRROR_HERO_TILE_WIDTH, keepLazy: true });
        observer.unobserve(img);
      }
    },
    { rootMargin: "200px 0px", threshold: 0.01 },
  );
  store[LAZY_REVEAL_OBSERVER_KEY] = observer;
  return observer;
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
  if (doc.getElementById("kn-mirror-visible-fallback")) {
    doc.documentElement.classList.add("kn-mirror-embed");
    return;
  }
  doc.documentElement.classList.add("kn-mirror-embed");
  if (!doc.getElementById("kn-mirror-embed-critical")) {
    const style = doc.createElement("style");
    style.id = "kn-mirror-embed-critical";
    style.textContent = MIRROR_EMBED_HERO_CRITICAL_CSS;
    doc.head.appendChild(style);
  }
}

export function mirrorImagesAlreadyRevealed(doc: Document): boolean {
  if (doc.querySelector("img.no-js-hidden, img.lazyload, img[lazyloading]")) return false;
  return Boolean(
    doc.getElementById("kn-mirror-visible-fallback") ||
      doc.getElementById("kn-mirror-content-boot") ||
      doc.documentElement.classList.contains("kn-mirror-embed"),
  );
}

export function revealMirrorImagesInDocument(doc: Document) {
  if (mirrorImagesAlreadyRevealed(doc)) {
    doc.documentElement.classList.add("kn-mirror-embed");
    return;
  }
  markMirrorEmbedRoot(doc);

  const lazyObserver = ensureLazyRevealObserver(doc);
  const candidates = doc.querySelectorAll(
    "img.no-js-hidden, img.lazyload, img[lazyload], img.media_image",
  );

  for (const node of candidates) {
    if (!(node instanceof HTMLImageElement)) continue;

    if (isProductOrListingCard(node)) {
      revealDeferredListingImage(node);
      continue;
    }

    if (isFirstHeroLcpImage(node, doc)) {
      revealMirrorImageElement(node, { width: MIRROR_LCP_IMAGE_WIDTH, highPriority: true });
      continue;
    }

    if (node.closest(".section-media-grid, .page--banner")) {
      if (lazyObserver) {
        lazyObserver.observe(node);
      } else {
        revealMirrorImageElement(node, { width: MIRROR_HERO_TILE_WIDTH, keepLazy: true });
      }
      continue;
    }

    revealMirrorImageElement(node, { width: MIRROR_HERO_TILE_WIDTH, keepLazy: true });
  }
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
