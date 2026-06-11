/** Varsayılan tema paketi — public/theme/{id}/mirror */
export const STORE_THEME_ID = "techizmet-shop";

export const STORE_THEME_PUBLIC = `/theme/${STORE_THEME_ID}`;

/** Mağaza satırındaki themeId — ileride müşteri başına farklı tema paketi */
export function resolveSiteThemeId(themeId?: string | null): string {
  const id = themeId?.trim();
  return id || STORE_THEME_ID;
}

export function siteThemePublicPath(themeId?: string | null): string {
  return `/theme/${resolveSiteThemeId(themeId)}`;
}

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
