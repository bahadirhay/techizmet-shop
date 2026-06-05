/** Canlı site kök URL — sitemap, canonical, JSON-LD */

export function getPublicSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_STORE_URL?.trim() ||
    "http://localhost:5555"
  ).replace(/\/$/, "");
}

export function toAbsoluteUrl(pathOrUrl: string, siteOrigin = getPublicSiteUrl()): string {
  const raw = pathOrUrl.trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${siteOrigin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

export function toAbsoluteMediaUrl(
  url: string | null | undefined,
  siteOrigin = getPublicSiteUrl(),
): string | undefined {
  if (!url?.trim()) return undefined;
  return toAbsoluteUrl(url.trim(), siteOrigin);
}
