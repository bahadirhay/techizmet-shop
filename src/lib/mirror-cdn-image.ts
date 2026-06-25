/** Görsel URL'leri — mobil LCP / liste kartları için boyut sınırı */

export const MIRROR_LCP_IMAGE_WIDTH = 750;
export const MIRROR_CARD_IMAGE_WIDTH = 400;
export const MIRROR_HERO_TILE_WIDTH = 600;
export const MIRROR_MOBILE_LCP_WIDTH = 640;

export function isResizableMirrorImageUrl(url: string): boolean {
  const path = url.split("?")[0]?.trim() ?? "";
  if (!path || path.startsWith("data:")) return false;
  if (path.startsWith("/uploads/")) return true;
  if (/^\/api\/media\/[^/]+$/i.test(path)) return true;
  if (path.includes("/cdn/shop/files/") || path.includes("/collections/")) return true;
  return false;
}

export function mirrorCdnImageUrl(url: string, width: number): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:")) return trimmed;

  const pathOnly = trimmed.split("?")[0] ?? trimmed;

  if (pathOnly.startsWith("/uploads/")) {
    return `/api/resize-image?w=${width}&src=${encodeURIComponent(pathOnly)}`;
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
