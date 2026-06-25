/** Favicon/logo URL — istemci ve sunucuda güvenli (node:fs yok) */

export function brandAssetCacheKey(url: string): string {
  const path = url.split("?")[0]?.trim() ?? "";
  if (!path) return "0";
  return path.replace(/[^\w-]/g, "").slice(-32) || "1";
}

export function withBrandAssetVersion(url: string): string {
  const u = url.trim();
  if (!u) return u;
  const key = brandAssetCacheKey(u);
  const stripped = u
    .replace(/([?&])v=[^&]*/g, "")
    .replace(/([?&])kn=[^&]*/g, "")
    .replace(/[?&]$/, "");
  const sep = stripped.includes("?") ? "&" : "?";
  return `${stripped}${sep}v=${key}`;
}
