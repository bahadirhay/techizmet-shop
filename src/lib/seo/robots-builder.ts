import "server-only";

import type { MetadataRoute } from "next";
import { getPublicSiteHost, getPublicSiteUrl } from "@/lib/seo/site-url";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteSeo } from "@/lib/site-settings";
import { normalizeRobotsDisallowPaths } from "@/lib/seo/robots-disallow-paths";

const DISALLOW = [
  "/admin/",
  "/api/",
  "/checkout/",
  "/cart",
  "/account/",
  "/bakim/",
  // Koleksiyonlar indeks sayfası — yalnızca tam /collections (alt slug'lar açık)
  "/collections$",
  // Mirror iframe kabukları — kanonik URL değil; çift içerik indekslenmesin
  "/_mirror-prebuilt/",
  "/theme/techizmet-shop/mirror/",
];

/**
 * Ürün, blog ve sayfa görselleri /api/media altında — genel /api/ engeli bunları da kapatır.
 * Bu izin eskiden yalnızca Google ve birkaç yapay zekâ botuna verilmişti; Bing, Yandex,
 * DuckDuckGo ve `*` altındaki tüm botlar görselleri tarayamıyordu (Yandex Görsel'de 0 görsel).
 * En uzun eşleşen kural kazandığı için `Allow: /api/media/`, `Disallow: /api/` kuralını geçer.
 */
const DEFAULT_CRAWL_ALLOW = ["/", "/api/media/", "/gorsel/", "/uploads/"];

const GOOGLE_CRAWL_ALLOW = ["/", "/products/", "/api/media/", "/gorsel/", "/uploads/", "/feeds/"];

const GOOGLE_IMAGE_ALLOW = ["/", "/products/", "/api/media/", "/gorsel/", "/uploads/"];

/** AI arama / alıntı botları — ürün sayfaları ve beslemeler */
const AI_SEARCH_ALLOW = [
  "/",
  "/products/",
  "/collections/",
  "/blogs/",
  "/feeds/",
  "/llms.txt",
  "/api/media/",
  "/gorsel/",
  "/uploads/",
];

/** Eğitim amaçlı tarama — opt-out (llms.txt bunu geçersiz kılmaz) */
const AI_TRAINING_DISALLOW = ["/"];

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function mergeDisallow(settings: SiteSettings, siteName: string): string[] {
  const seo = getSiteSeo(settings, siteName);
  const custom = normalizeRobotsDisallowPaths(seo.robotsDisallowPaths);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of [...DISALLOW, ...custom]) {
    if (seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

/** MetadataRoute.Robots → robots.txt metni (Next'in çıktısıyla aynı biçim) */
export function serializeRobots(robots: MetadataRoute.Robots): string {
  const rules = Array.isArray(robots.rules) ? robots.rules : robots.rules ? [robots.rules] : [];
  const blocks: string[] = [];

  for (const rule of rules) {
    const lines: string[] = [];
    const agents = toArray(rule.userAgent);
    for (const agent of agents.length ? agents : ["*"]) lines.push(`User-Agent: ${agent}`);
    for (const path of toArray(rule.allow)) lines.push(`Allow: ${path}`);
    for (const path of toArray(rule.disallow)) lines.push(`Disallow: ${path}`);
    if (typeof rule.crawlDelay === "number") lines.push(`Crawl-delay: ${rule.crawlDelay}`);
    blocks.push(lines.join("\n"));
  }

  const tail: string[] = [];
  if (robots.host) tail.push(`Host: ${robots.host}`);
  for (const sitemap of toArray(robots.sitemap)) tail.push(`Sitemap: ${sitemap}`);
  if (tail.length) blocks.push(tail.join("\n"));

  return `${blocks.join("\n\n")}\n`;
}

export function buildStoreRobots(settings: SiteSettings, siteName: string): MetadataRoute.Robots {
  const seo = getSiteSeo(settings, siteName);
  const sitemap = `${getPublicSiteUrl()}/sitemap.xml`;
  const disallow = mergeDisallow(settings, siteName);

  if (!seo.robotsIndex) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap,
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: DEFAULT_CRAWL_ALLOW, disallow },
      { userAgent: "Googlebot", allow: GOOGLE_CRAWL_ALLOW, disallow },
      {
        userAgent: "Googlebot-Image",
        allow: GOOGLE_IMAGE_ALLOW,
        disallow: ["/admin/", "/api/admin/", ...disallow.filter((p) => p !== "/admin/" && !p.startsWith("/api/"))],
      },
      { userAgent: "Bingbot", allow: DEFAULT_CRAWL_ALLOW, disallow },
      { userAgent: "Yandex", allow: DEFAULT_CRAWL_ALLOW, disallow },
      { userAgent: "DuckDuckBot", allow: DEFAULT_CRAWL_ALLOW, disallow },
      { userAgent: "OAI-SearchBot", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "PerplexityBot", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "ClaudeBot", allow: AI_SEARCH_ALLOW, disallow },
      // Yapay zekâ araması ve kullanıcı adına sayfa açan araçlar (eğitim taraması değil)
      { userAgent: "Claude-SearchBot", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "ChatGPT-User", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "Claude-User", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "Perplexity-User", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "Applebot", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "Google-Extended", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "GPTBot", disallow: AI_TRAINING_DISALLOW },
      { userAgent: "CCBot", disallow: AI_TRAINING_DISALLOW },
      { userAgent: "anthropic-ai", disallow: AI_TRAINING_DISALLOW },
    ],
    sitemap,
    host: getPublicSiteHost(),
  };
}
