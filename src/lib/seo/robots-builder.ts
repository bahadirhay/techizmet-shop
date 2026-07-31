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
  // Mirror iframe kabukları — kanonik URL değil; çift içerik indekslenmesin
  "/_mirror-prebuilt/",
  "/theme/techizmet-shop/mirror/",
];

/** Ürün görselleri /api/media altında — genel /api/ engeli bunları da kapatıyordu */
const GOOGLE_CRAWL_ALLOW = ["/", "/products/", "/api/media/", "/uploads/", "/feeds/"];

const GOOGLE_IMAGE_ALLOW = ["/", "/products/", "/api/media/", "/uploads/"];

/** AI arama / alıntı botları — ürün sayfaları ve beslemeler */
const AI_SEARCH_ALLOW = [
  "/",
  "/products/",
  "/collections/",
  "/blogs/",
  "/feeds/",
  "/llms.txt",
  "/api/media/",
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
      { userAgent: "*", allow: "/", disallow },
      { userAgent: "Googlebot", allow: GOOGLE_CRAWL_ALLOW, disallow },
      {
        userAgent: "Googlebot-Image",
        allow: GOOGLE_IMAGE_ALLOW,
        disallow: ["/admin/", "/api/admin/", ...disallow.filter((p) => p !== "/admin/" && !p.startsWith("/api/"))],
      },
      { userAgent: "Bingbot", allow: "/", disallow },
      { userAgent: "Yandex", allow: "/", disallow },
      { userAgent: "DuckDuckBot", allow: "/", disallow },
      { userAgent: "OAI-SearchBot", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "PerplexityBot", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "ClaudeBot", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "Google-Extended", allow: AI_SEARCH_ALLOW, disallow },
      { userAgent: "GPTBot", disallow: AI_TRAINING_DISALLOW },
      { userAgent: "CCBot", disallow: AI_TRAINING_DISALLOW },
      { userAgent: "anthropic-ai", disallow: AI_TRAINING_DISALLOW },
    ],
    sitemap,
    host: getPublicSiteHost(),
  };
}
