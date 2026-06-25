/** /api/resize-image — izin verilen kaynak yolları */

const THEME_RASTER_RE =
  /^\/theme\/[^/]+\/cdn\/shop\/(files|collections|articles)\/[^/]+\.(jpe?g|png|webp)$/i;

export function normalizeMirrorResizeSrc(src: string): string | null {
  const pathOnly = src.split("?")[0]?.trim() ?? "";
  if (!pathOnly || pathOnly.includes("..")) return null;
  if (pathOnly.startsWith("/uploads/")) return pathOnly;
  if (THEME_RASTER_RE.test(pathOnly)) return pathOnly;
  return null;
}

export function buildMirrorResizeImageApiUrl(pathOnly: string, width: number): string {
  return `/api/resize-image?w=${width}&src=${encodeURIComponent(pathOnly)}`;
}
