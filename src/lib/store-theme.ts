/** Vitrin tema kimliği — public/theme/{id}, DB themeId, preset dosyaları */
export const STORE_THEME_ID = "techizmet-shop";

export const STORE_THEME_PUBLIC = `/theme/${STORE_THEME_ID}`;

export function storeThemePath(subpath = ""): string {
  const tail = subpath.replace(/^\/+/, "");
  return tail ? `${STORE_THEME_PUBLIC}/${tail}` : STORE_THEME_PUBLIC;
}
