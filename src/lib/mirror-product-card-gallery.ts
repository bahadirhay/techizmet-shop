/** Liste kartları — fare ile görsel scrub + çizgi göstergesi */

const STYLE_ID = "kn-card-gallery-styles";
const MAX_PRELOAD = 6;

function ensureGalleryStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
[data-kn-gallery] {
  position: relative;
}
.kn-card-gallery-indicator {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  display: flex;
  gap: 3px;
  height: 2px;
  pointer-events: none;
  z-index: 3;
  opacity: 0;
  transition: opacity 0.15s ease;
}
[data-kn-gallery]:hover .kn-card-gallery-indicator,
[data-kn-gallery].kn-card-gallery-active .kn-card-gallery-indicator {
  opacity: 1;
}
.kn-card-gallery-seg {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  transition: background 0.12s ease;
}
.kn-card-gallery-seg--active {
  background: rgba(255, 255, 255, 0.95);
}
.product--card-image img.product--card-image {
  transition: opacity 0.12s ease;
}
`;
  doc.head.appendChild(style);
}

function parseGalleryUrls(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
  } catch {
    return [];
  }
}

function galleryIndex(clientX: number, rect: DOMRect, count: number): number {
  if (count <= 1) return 0;
  const ratio = (clientX - rect.left) / Math.max(rect.width, 1);
  return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
}

function setActiveSegment(indicator: Element | null, index: number) {
  if (!indicator) return;
  indicator.querySelectorAll(".kn-card-gallery-seg").forEach((seg, i) => {
    seg.classList.toggle("kn-card-gallery-seg--active", i === index);
  });
}

function preloadUrls(urls: string[], fromIndex = 1) {
  for (let i = fromIndex; i < Math.min(urls.length, MAX_PRELOAD); i++) {
    const img = new Image();
    img.src = urls[i]!;
  }
}

function bindGalleryMedia(media: HTMLElement) {
  if (media.getAttribute("data-kn-gallery-bound") === "1") return;

  const urls = parseGalleryUrls(media.getAttribute("data-kn-gallery"));
  if (urls.length <= 1) return;

  const img = media.querySelector("img.product--card-image, img") as HTMLImageElement | null;
  if (!img) return;

  media.setAttribute("data-kn-gallery-bound", "1");
  let activeIndex = 0;
  let preloaded = false;

  const showIndex = (index: number) => {
    if (index === activeIndex && img.getAttribute("src") === urls[index]) return;
    activeIndex = index;
    const next = urls[index];
    if (next && img.getAttribute("src") !== next) {
      img.src = next;
      img.setAttribute("data-src", next);
      img.setAttribute("data-original", next);
    }
    setActiveSegment(media.querySelector(".kn-card-gallery-indicator"), index);
  };

  const onEnter = () => {
    media.classList.add("kn-card-gallery-active");
    if (!preloaded) {
      preloaded = true;
      preloadUrls(urls);
    }
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const rect = media.getBoundingClientRect();
    showIndex(galleryIndex(event.clientX, rect, urls.length));
  };

  const onLeave = () => {
    media.classList.remove("kn-card-gallery-active");
    showIndex(0);
  };

  media.addEventListener("pointerenter", onEnter);
  media.addEventListener("pointermove", onMove);
  media.addEventListener("pointerleave", onLeave);
}

function canBindGalleriesInDocument(doc: Document): boolean {
  return typeof doc.defaultView?.Image === "function";
}

/** Kart HTML'ine enjekte edilen galeri markup'ını bağlar */
export function initProductCardGalleries(doc: Document) {
  if (!canBindGalleriesInDocument(doc)) return;
  ensureGalleryStyles(doc);
  doc.querySelectorAll<HTMLElement>("[data-kn-gallery]").forEach(bindGalleryMedia);
}

/** Ürün kartı görsel alanı — çoklu URL + çizgi göstergesi */
export function buildProductCardGalleryMarkup(urls: string[]): {
  galleryAttr: string;
  indicatorHtml: string;
} {
  if (urls.length <= 1) {
    return { galleryAttr: "", indicatorHtml: "" };
  }
  const json = JSON.stringify(urls).replace(/</g, "\\u003c");
  const segments = urls
    .map(
      (_, i) =>
        `<span class="kn-card-gallery-seg${i === 0 ? " kn-card-gallery-seg--active" : ""}"></span>`,
    )
    .join("");
  return {
    galleryAttr: ` data-kn-gallery='${json}'`,
    indicatorHtml: `<div class="kn-card-gallery-indicator" aria-hidden="true">${segments}</div>`,
  };
}
