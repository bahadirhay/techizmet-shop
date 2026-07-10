import { getPublicSiteUrl, normalizeSiteUrl, toAbsoluteMediaUrl } from "@/lib/seo/site-url";

const AMAZON_IMAGE_QUERY = "format=jpeg&width=1600&amazon=1";

function amazonOrigin(siteOrigin?: string): string {
  return (siteOrigin ?? getPublicSiteUrl()).replace(/\/$/, "");
}

/** Amazon listing — JPEG, HTTPS, min 1000px; /api/media WebP veya zaman aşımı sorununu önler. */
export function toAmazonListingImageUrl(
  url: string | null | undefined,
  siteOrigin = getPublicSiteUrl(),
): string | undefined {
  const abs = toAbsoluteMediaUrl(url, siteOrigin);
  if (!abs) return undefined;

  const origin = amazonOrigin(siteOrigin);

  const mediaId = abs.match(/\/api\/media\/([^/?#]+)/i)?.[1];
  if (mediaId) {
    return `${origin}/api/media/${mediaId}?${AMAZON_IMAGE_QUERY}`;
  }

  if (abs.includes("/api/resize-image")) {
    const parsed = new URL(abs);
    parsed.searchParams.set("format", "jpeg");
    parsed.searchParams.set("width", "1600");
    parsed.searchParams.set("amazon", "1");
    return parsed.toString();
  }

  try {
    const parsed = new URL(abs);
    const path = parsed.pathname;
    if (path.startsWith("/uploads/") || path.startsWith("/brands/")) {
      const qs = new URLSearchParams({
        src: path,
        width: "1600",
        format: "jpeg",
        amazon: "1",
      });
      return `${origin}/api/resize-image?${qs}`;
    }
  } catch {
    /* geçersiz URL */
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

/** Entegrasyon ayarı veya tenant kökü — Amazon görsel URL'leri için kanonik HTTPS kök. */
export function resolveAmazonImageOrigin(config: Record<string, string>): string {
  const fromConfig =
    config.amazonImageOrigin?.trim() ||
    config.amazonPublicOrigin?.trim() ||
    config.publicSiteUrl?.trim();
  if (fromConfig) return amazonOrigin(normalizeSiteUrl(fromConfig));
  return amazonOrigin();
}
