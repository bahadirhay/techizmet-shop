/** Shopify CDN görselleri — mobil LCP / liste kartları için boyut sınırı */

export const MIRROR_LCP_IMAGE_WIDTH = 750;
export const MIRROR_CARD_IMAGE_WIDTH = 480;
export const MIRROR_HERO_TILE_WIDTH = 600;

export function mirrorCdnImageUrl(url: string, width: number): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:")) return trimmed;
  if (/\bwidth=\{width\}/i.test(trimmed)) {
    return trimmed.replace(/\bwidth=\{width\}/i, `width=${width}`);
  }
  if (/\bwidth=\d+/i.test(trimmed)) {
    return trimmed.replace(/\bwidth=\d+/i, `width=${width}`);
  }
  const sep = trimmed.includes("?") ? "&" : "?";
  return `${trimmed}${sep}width=${width}`;
}
