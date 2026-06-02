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

/** Markalı mirror HTML API — sunucu + istemci güvenli */
export function mirrorVitrinApiSrc(
  publicPath: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  const path = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
  const q = new URLSearchParams({ path });
  if (pageKey) q.set("pageKey", pageKey);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v?.trim()) q.set(k, v.trim());
    }
  }
  return `/api/vitrin/mirror?${q.toString()}`;
}

/** Production: statik prebuilt; geliştirme: markalı API */
export function buildMirrorIframeSrc(
  publicPath: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  if (process.env.NODE_ENV === "production") {
    return prebuiltMirrorPublicUrl(
      publicPath.startsWith("/") ? publicPath.slice(1) : publicPath,
    );
  }
  return mirrorVitrinApiSrc(publicPath, pageKey, extra);
}

/** /theme/techizmet-shop/mirror/... → statik prebuilt veya markalı API */
export function toBrandedMirrorSrc(
  publicPath: string,
  pageKey?: string,
  extra?: Record<string, string | undefined>,
): string {
  return buildMirrorIframeSrc(publicPath, pageKey, extra);
}
