/** Mirror iframe — yalnızca LCP hero görseli öne alınır; ürün kartları lazy kalır */

import {
  MIRROR_CARD_IMAGE_WIDTH,
  MIRROR_HERO_TILE_WIDTH,
  MIRROR_MOBILE_LCP_WIDTH,
  isResizableMirrorImageUrl,
  mirrorCdnImageUrl,
  mirrorImageNeedsResize,
} from "@/lib/mirror-cdn-image";

export function resolveMirrorImageUrl(img: HTMLImageElement): string | null {
  for (const raw of [img.getAttribute("data-original"), img.getAttribute("data-src"), img.src]) {
    const url = raw?.trim();
    if (!url || url.includes("{width}")) continue;
    const path = url.split("?")[0] ?? "";
    if (path.includes("/api/resize-image")) continue;
    return url;
  }
  return null;
}

function isProductOrListingCard(img: HTMLImageElement): boolean {
  if (
    img.classList.contains("product--card-image") ||
    img.classList.contains("collection--card-image") ||
    img.classList.contains("collections-tab--image") ||
    img.classList.contains("kn-blog-card-img")
  ) {
    return true;
  }
  return Boolean(
    img.closest(".main-collection--products-list, .product--card, .collections-tab--products, .kn-blog-card"),
  );
}

function isFirstHeroLcpImage(img: HTMLImageElement, doc: Document): boolean {
  const firstSection = doc.querySelector(
    "#MainContent > .section-media-grid:first-of-type, .section-media-grid:first-of-type",
  );
  if (!firstSection?.contains(img)) return false;
  const firstImg = firstSection.querySelector("img.media_image, img");
  return img === firstImg;
}

function isHeroGridImage(img: HTMLImageElement): boolean {
  return Boolean(img.closest(".section-media-grid") && img.classList.contains("media_image"));
}

function applySizedMirrorImage(
  img: HTMLImageElement,
  width: number,
  opts?: { highPriority?: boolean; keepLazy?: boolean },
) {
  const rawUrl = resolveMirrorImageUrl(img);
  if (!rawUrl) return;
  const base = rawUrl.split("?")[0] ?? rawUrl;
  const sized = isResizableMirrorImageUrl(base) ? mirrorCdnImageUrl(base, width) : rawUrl;

  img.classList.remove("no-js-hidden", "lazyload", "lazyloading");
  img.classList.add("lazyloaded");
  img.removeAttribute("srcset");
  img.removeAttribute("data-srcset");

  if (opts?.highPriority) {
    img.setAttribute("fetchpriority", "high");
    img.setAttribute("elementtiming", "kn-hero-lcp");
    img.removeAttribute("loading");
  } else {
    img.setAttribute("loading", "lazy");
    img.removeAttribute("fetchpriority");
  }

  img.src = sized;
  img.setAttribute("data-src", sized);
  img.setAttribute("data-original", base);
  img.setAttribute("data-kn-sized", "1");
}

/** Prebuild veya overlay sonrası tam boy görselleri zorla küçült */
export function forceMirrorResponsiveImagesInDocument(doc: Document) {
  markMirrorEmbedRoot(doc);

  for (const node of doc.querySelectorAll("img")) {
    if (!(node instanceof HTMLImageElement)) continue;
    if (!mirrorImageNeedsResize(node) && node.getAttribute("data-kn-sized") === "1") continue;

    const raw = resolveMirrorImageUrl(node);
    if (!raw || !isResizableMirrorImageUrl(raw)) continue;

    if (isProductOrListingCard(node)) {
      applySizedMirrorImage(node, MIRROR_CARD_IMAGE_WIDTH, { keepLazy: true });
      continue;
    }
    if (isFirstHeroLcpImage(node, doc)) {
      applySizedMirrorImage(node, MIRROR_MOBILE_LCP_WIDTH, { highPriority: true });
      continue;
    }
    if (isHeroGridImage(node) || node.closest(".section-media-grid, .page--banner")) {
      applySizedMirrorImage(node, MIRROR_HERO_TILE_WIDTH, { keepLazy: true });
      continue;
    }
    applySizedMirrorImage(node, MIRROR_HERO_TILE_WIDTH, { keepLazy: true });
  }
}

function revealDeferredListingImage(img: HTMLImageElement) {
  applySizedMirrorImage(img, MIRROR_CARD_IMAGE_WIDTH, { keepLazy: true });
}

function downgradeOversizedMirrorImage(img: HTMLImageElement, width: number, keepLazy = true) {
  if (!mirrorImageNeedsResize(img) && img.getAttribute("data-kn-sized") === "1") return;
  applySizedMirrorImage(img, width, { keepLazy });
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
        downgradeOversizedMirrorImage(img, MIRROR_HERO_TILE_WIDTH, true);
        observer.unobserve(img);
      }
    },
    { rootMargin: "120px 0px", threshold: 0.01 },
  );
  store[LAZY_REVEAL_OBSERVER_KEY] = observer;
  return observer;
}

export const MIRROR_EMBED_HERO_CRITICAL_CSS = `
:root { --kn-mobile-hero-h: min(52vw, 240px); }
#MainContent > .section-media-grid:first-of-type {
  --desktop_height: 280px !important;
  --mobile_height: var(--kn-mobile-hero-h) !important;
  height: var(--kn-mobile-hero-h) !important;
  min-height: var(--kn-mobile-hero-h) !important;
  max-height: 50vh !important;
  overflow: hidden !important;
  contain: strict;
}
#MainContent > .section-media-grid:first-of-type .media-grid--wrapper {
  height: 100% !important;
  min-height: var(--kn-mobile-hero-h) !important;
  max-height: 50vh !important;
  position: relative !important;
  overflow: hidden !important;
}
#MainContent > .section-media-grid:first-of-type .media-grid--item {
  position: relative !important;
  min-height: calc(var(--kn-mobile-hero-h) / 2) !important;
  overflow: hidden !important;
}
#MainContent > .section-media-grid:first-of-type .media-grid--image {
  position: absolute !important;
  inset: 0 !important;
  overflow: hidden !important;
}
#MainContent > .section-media-grid:first-of-type .media-grid--image .media,
#MainContent > .section-media-grid:first-of-type .media-grid--image .media-fixed {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
}
#MainContent > .section-media-grid:first-of-type img.media_image {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: cover !important;
}
#MainContent > .section-media-grid:first-of-type .media-content.large {
  position: absolute !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  z-index: 2 !important;
  pointer-events: none !important;
  max-height: 45% !important;
  overflow: hidden !important;
  padding: 8px 12px !important;
}
@media (max-width: 768px) {
  #MainContent > .section-media-grid:first-of-type .media-content-heading {
    font-size: clamp(0.95rem, 4.2vw, 1.25rem) !important;
    line-height: 1.2 !important;
    margin: 0 !important;
  }
  #MainContent > .section-media-grid:first-of-type .media-content-description {
    font-size: clamp(0.75rem, 3.2vw, 0.9rem) !important;
    line-height: 1.3 !important;
    margin: 4px 0 0 !important;
  }
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

export function mirrorImagesAlreadyRevealed(doc: Document): boolean {
  return doc.documentElement.classList.contains("kn-mirror-embed-revealed");
}

export function revealMirrorImagesInDocument(doc: Document) {
  forceMirrorResponsiveImagesInDocument(doc);

  const lazyObserver = ensureLazyRevealObserver(doc);
  const candidates = doc.querySelectorAll("img.no-js-hidden, img.lazyload, img[lazyloading]");

  for (const node of candidates) {
    if (!(node instanceof HTMLImageElement)) continue;

    if (isProductOrListingCard(node)) {
      revealDeferredListingImage(node);
      continue;
    }

    if (isFirstHeroLcpImage(node, doc)) {
      applySizedMirrorImage(node, MIRROR_MOBILE_LCP_WIDTH, { highPriority: true });
      continue;
    }

    if (isHeroGridImage(node)) {
      if (lazyObserver) lazyObserver.observe(node);
      else downgradeOversizedMirrorImage(node, MIRROR_HERO_TILE_WIDTH, true);
      continue;
    }

    if (lazyObserver) lazyObserver.observe(node);
    else downgradeOversizedMirrorImage(node, MIRROR_HERO_TILE_WIDTH, true);
  }

  for (const node of doc.querySelectorAll(".section-media-grid img.media_image")) {
    if (!(node instanceof HTMLImageElement)) continue;
    if (isFirstHeroLcpImage(node, doc)) continue;
    if (!mirrorImageNeedsResize(node) && node.getAttribute("data-kn-sized") === "1") continue;
    if (lazyObserver) lazyObserver.observe(node);
    else downgradeOversizedMirrorImage(node, MIRROR_HERO_TILE_WIDTH, true);
  }

  for (const node of doc.querySelectorAll("img.product--card-image, img.collections-tab--image")) {
    if (!(node instanceof HTMLImageElement)) continue;
    if (!mirrorImageNeedsResize(node) && node.getAttribute("data-kn-sized") === "1") continue;
    revealDeferredListingImage(node);
  }

  doc.documentElement.classList.add("kn-mirror-embed-revealed");
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
