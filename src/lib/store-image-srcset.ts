/**
 * Mağaza medya görselleri (/api/media/<id> ve /gorsel/<id>/<ad>) için boyutlu adres + srcset.
 * İstemci ve sunucuda kullanılabilir (bağımlılığı yoktur).
 */

const STORE_MEDIA_PATH_RE = /^\/(?:api\/media\/[^/?#]+|gorsel\/[^/?#]+\/[^/?#]+)$/i;

/** ?width= ile yeniden boyutlandırılabilen mağaza medya adresi mi */
export function isStoreMediaPath(url: string | null | undefined): boolean {
  const path = url?.trim().split("?")[0] ?? "";
  return STORE_MEDIA_PATH_RE.test(path);
}

export function storeImageSized(url: string, width: number): string {
  const trimmed = url.trim();
  if (!isStoreMediaPath(trimmed)) return trimmed;
  return `${trimmed.split("?")[0]}?width=${width}`;
}

export function storeImageSrcSet(url: string, widths: readonly number[]): string | undefined {
  if (!isStoreMediaPath(url)) return undefined;
  return widths.map((w) => `${storeImageSized(url, w)} ${w}w`).join(", ");
}

/** Ürün kartı görseli: 2 sütun (mobil) → 4 sütun (masaüstü) */
export const PRODUCT_CARD_IMAGE_WIDTHS = [240, 400, 600, 800] as const;
export const PRODUCT_CARD_IMAGE_SIZES =
  "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px";
