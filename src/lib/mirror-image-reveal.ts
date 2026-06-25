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

function bindMirrorHeroPaintedClass(doc: Document) {
  const first = doc.querySelector(
    ".section-media-grid:first-of-type img.media_image, .section-media-grid:first-of-type img",
  );
  const mark = () => doc.documentElement.classList.add("kn-mirror-hero-painted");
  if (!(first instanceof HTMLImageElement)) {
    mark();
    return;
  }
  if (first.complete && first.naturalWidth > 0) mark();
  else first.addEventListener("load", mark, { once: true });
  window.setTimeout(mark, 2500);
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

  bindMirrorHeroPaintedClass(doc);
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
html.kn-mirror-embed #MainContent > .section-media-grid:first-of-type {
  --desktop_height: 280px !important;
  --mobile_height: min(52vw, 240px) !important;
  min-height: min(52vw, 240px);
  contain: layout;
}
html.kn-mirror-embed .section-media-grid:first-of-type .media-grid--wrapper {
  min-height: min(52vw, 240px);
  position: relative;
}
html.kn-mirror-embed .section-media-grid:first-of-type .media-grid--item {
  min-height: min(26vw, 120px);
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
html.kn-mirror-embed .section-media-grid .media-content.large {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
}
html.kn-mirror-embed:not(.kn-mirror-hero-painted) .section-media-grid:first-of-type .media-content {
  visibility: hidden;
}
html.kn-mirror-embed.kn-mirror-hero-painted .section-media-grid:first-of-type .media-content {
  visibility: visible;
}
@media (max-width: 768px) {
  html.kn-mirror-embed .section-media-grid .media-content-heading {
    font-size: clamp(1rem, 4.5vw, 1.35rem);
    line-height: 1.2;
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
