/** Vitrin tema kimliği — public/theme/{id}, DB themeId, preset dosyaları */
export const STORE_THEME_ID = "techizmet-shop";

export const STORE_THEME_PUBLIC = `/theme/${STORE_THEME_ID}`;

export function storeThemePath(subpath = ""): string {
  const tail = subpath.replace(/^\/+/, "");
  return tail ? `${STORE_THEME_PUBLIC}/${tail}` : STORE_THEME_PUBLIC;
}

const LEGACY_THEME_PREFIX = "/theme/king-noor";

/** DB veya eski mirror HTML'deki yolları güncel tema kimliğine çevirir */
export function rewriteLegacyThemePaths(text: string): string {
  if (!text.includes(LEGACY_THEME_PREFIX)) return text;
  return text.replaceAll(LEGACY_THEME_PREFIX, STORE_THEME_PUBLIC);
}
