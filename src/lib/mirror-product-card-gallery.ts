/** Liste kartları — fare ile görsel scrub + çizgi göstergesi */

const STYLE_ID = "kn-card-gallery-styles";
const DELEGATE_ID = "kn-card-gallery-delegate";
const MAX_PRELOAD = 6;

function ensureGalleryStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
[data-kn-gallery] {
  position: relative;
  pointer-events: auto;
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
  transition: opacity 0.12s ease, transform 0.6s ease;
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

/** State per-element, key = data-kn-gallery string (immutable per card) */
const galleryState = new WeakMap<Element, {
  urls: string[];
  activeIndex: number;
  preloaded: boolean;
}>();

function getOrInitState(media: Element) {
  let state = galleryState.get(media);
  if (!state) {
    const urls = parseGalleryUrls(media.getAttribute("data-kn-gallery"));
    if (urls.length <= 1) return null;
    state = { urls, activeIndex: 0, preloaded: false };
    galleryState.set(media, state);
  }
  return state;
}

function showIndex(media: Element, index: number) {
  const state = getOrInitState(media);
  if (!state) return;
  const img = media.querySelector("img.product--card-image, img") as HTMLImageElement | null;
  if (!img) return;
  state.activeIndex = index;
  const next = state.urls[index];
  if (next && img.getAttribute("src") !== next) {
    img.src = next;
    img.setAttribute("data-src", next);
    img.setAttribute("data-original", next);
  }
  setActiveSegment(media.querySelector(".kn-card-gallery-indicator"), index);
}

function closestGallery(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>("[data-kn-gallery]");
  return el ?? null;
}

function canBindGalleriesInDocument(doc: Document): boolean {
  const view = doc.defaultView;
  return !!view && typeof view.Image === "function";
}

/**
 * Galeriyi delegated listener ile kurar — tema JS DOM'u değiştirsek de çalışır.
 * Birden fazla çağrı güvenli (idempotent).
 */
export function initProductCardGalleries(doc: Document) {
  if (!canBindGalleriesInDocument(doc)) return;
  ensureGalleryStyles(doc);

  if (doc.getElementById(DELEGATE_ID)) return; // zaten kurulu

  const marker = doc.createElement("meta");
  marker.id = DELEGATE_ID;
  (doc.head ?? doc.body).appendChild(marker);

  doc.addEventListener("pointermove", (event: Event) => {
    const pe = event as PointerEvent;
    if (pe.pointerType === "touch") return;
    const media = closestGallery(pe.target);
    if (!media) return;
    const state = getOrInitState(media);
    if (!state) return;
    if (!state.preloaded) {
      state.preloaded = true;
      preloadUrls(state.urls);
    }
    const rect = media.getBoundingClientRect();
    showIndex(media, galleryIndex(pe.clientX, rect, state.urls.length));
  });

  doc.addEventListener("pointerenter", (event: Event) => {
    const media = closestGallery((event as PointerEvent).target);
    if (!media) return;
    const state = getOrInitState(media);
    if (!state) return;
    media.classList.add("kn-card-gallery-active");
    if (!state.preloaded) {
      state.preloaded = true;
      preloadUrls(state.urls);
    }
  }, true);

  doc.addEventListener("pointerleave", (event: Event) => {
    const media = closestGallery((event as PointerEvent).target);
    if (!media) return;
    media.classList.remove("kn-card-gallery-active");
    showIndex(media, 0);
  }, true);
}

/** Sunucu/prebuild HTML — bağlı sanılan ama dinleyicisiz galeri bayraklarını temizler */
export function stripProductCardGalleryBoundFlags(doc: Document) {
  doc.querySelectorAll("[data-kn-gallery-bound]").forEach((media) => {
    media.removeAttribute("data-kn-gallery-bound");
  });
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
