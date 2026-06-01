/** Vitrin iframe URL — istemci ve sunucu güvenli (node:fs yok) */

export const MIRROR_PREBUILT_PREFIX = "_mirror-prebuilt";

export function prebuiltMirrorPublicUrl(normalized: string): string {
  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  return `/${MIRROR_PREBUILT_PREFIX}/${path}`;
}

/** Ham mirror HTML (public/theme/...) — yedek statik yol */
export function rawMirrorPublicUrl(normalized: string): string {
  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  return `/${path}`;
}

/** Production: statik prebuilt; geliştirme: markalı API */
export function buildMirrorIframeSrc(
  publicPath: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  const path = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;

  if (process.env.NODE_ENV === "production") {
    return prebuiltMirrorPublicUrl(path);
  }

  const q = new URLSearchParams({ path });
  if (pageKey) q.set("pageKey", pageKey);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v?.trim()) q.set(k, v.trim());
    }
  }
  return `/api/vitrin/mirror?${q.toString()}`;
}

/** /theme/techizmet-shop/mirror/... → statik prebuilt veya markalı API */
export function toBrandedMirrorSrc(
  publicPath: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  return buildMirrorIframeSrc(publicPath, pageKey, extra);
}
