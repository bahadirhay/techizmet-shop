import { getActivePublicOrigin } from "@/lib/tenant-context";

/** Canlı site kök URL — sitemap, canonical, JSON-LD */

/** `anatolian-paw.vercel.app` gibi protokolsüz değerleri https ile tamamlar */
export function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "http://localhost:5555";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getPublicSiteUrl(): string {
  const fromHost = getActivePublicOrigin();
  if (fromHost) return fromHost;

  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_STORE_URL?.trim() ||
    "";
  return normalizeSiteUrl(raw || "http://localhost:5555");
}

export function getPublicSiteHost(): string {
  try {
    return new URL(getPublicSiteUrl()).host;
  } catch {
    return "localhost";
  }
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
