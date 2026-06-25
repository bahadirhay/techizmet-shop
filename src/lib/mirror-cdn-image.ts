/** Görsel URL'leri — mobil LCP / liste kartları için boyut sınırı */

import {
  buildMirrorResizeImageApiUrl,
  normalizeMirrorResizeSrc,
} from "@/lib/mirror-resize-src";

export const MIRROR_LCP_IMAGE_WIDTH = 750;
export const MIRROR_CARD_IMAGE_WIDTH = 400;
export const MIRROR_HERO_TILE_WIDTH = 600;
export const MIRROR_MOBILE_LCP_WIDTH = 640;

export function isResizableMirrorImageUrl(url: string): boolean {
  const path = url.split("?")[0]?.trim() ?? "";
  if (!path || path.startsWith("data:")) return false;
  if (/\.svg$/i.test(path)) return false;
  return normalizeMirrorResizeSrc(path) !== null;
}

export function mirrorCdnImageUrl(url: string, width: number): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:")) return trimmed;

  const pathOnly = trimmed.split("?")[0] ?? trimmed;
  const resizePath = normalizeMirrorResizeSrc(pathOnly);
  if (resizePath) {
    return buildMirrorResizeImageApiUrl(resizePath, width);
  }

  const mediaMatch = pathOnly.match(/^\/api\/media\/([^/]+)$/i);
  if (mediaMatch) {
    return `/api/media/${mediaMatch[1]}?width=${width}`;
  }

  if (/\bwidth=\{width\}/i.test(trimmed)) {
    return trimmed.replace(/\bwidth=\{width\}/i, `width=${width}`);
  }
  if (/\bwidth=\d+/i.test(trimmed)) {
    return trimmed.replace(/\bwidth=\d+/i, `width=${width}`);
  }
  const sep = trimmed.includes("?") ? "&" : "?";
  return `${trimmed}${sep}width=${width}`;
}

export function mirrorMobileImageUrl(url: string, kind: "lcp" | "hero" | "card"): string {
  const width =
    kind === "lcp" ? MIRROR_MOBILE_LCP_WIDTH : kind === "card" ? MIRROR_CARD_IMAGE_WIDTH : MIRROR_HERO_TILE_WIDTH;
  return mirrorCdnImageUrl(url, width);
}

/** Tam boy kaynak — resize API'ye yönlendirilmeli mi */
export function mirrorImageNeedsResize(img: Pick<HTMLImageElement, "src" | "getAttribute">): boolean {
  const src = img.src?.trim() ?? "";
  if (!src || src.startsWith("data:")) return false;
  if (src.includes("/api/resize-image")) return false;

  for (const raw of [src, img.getAttribute("data-src"), img.getAttribute("data-original")]) {
    const path = raw?.split("?")[0]?.trim() ?? "";
    if (path && normalizeMirrorResizeSrc(path)) return true;
  }

  const path = src.split("?")[0] ?? "";
  if (/^\/api\/media\/[^/]+$/i.test(path) && !/[?&]width=\d+/i.test(src)) return true;
  return false;
}
