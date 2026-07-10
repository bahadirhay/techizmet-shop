import { getPublicSiteUrl, toAbsoluteMediaUrl } from "@/lib/seo/site-url";

const AMAZON_IMAGE_QUERY = "format=jpeg&width=1600&amazon=1";

/** Amazon listing — JPEG, HTTPS, min 1000px; /api/media WebP veya zaman aşımı sorununu önler. */
export function toAmazonListingImageUrl(
  url: string | null | undefined,
  siteOrigin = getPublicSiteUrl(),
): string | undefined {
  const abs = toAbsoluteMediaUrl(url, siteOrigin);
  if (!abs) return undefined;

  const mediaId = abs.match(/\/api\/media\/([^/?#]+)/i)?.[1];
  if (mediaId) {
    const origin = siteOrigin.replace(/\/$/, "");
    return `${origin}/api/media/${mediaId}?${AMAZON_IMAGE_QUERY}`;
  }

  if (abs.includes("/api/resize-image")) {
    const parsed = new URL(abs);
    parsed.searchParams.set("format", "jpeg");
    parsed.searchParams.set("width", "1600");
    parsed.searchParams.set("amazon", "1");
    return parsed.toString();
  }

  return abs;
}

export function toAmazonListingImageUrls(
  urls: string[],
  siteOrigin = getPublicSiteUrl(),
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const url = toAmazonListingImageUrl(raw, siteOrigin);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}
