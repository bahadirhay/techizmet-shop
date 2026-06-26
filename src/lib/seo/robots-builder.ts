import "server-only";

import type { MetadataRoute } from "next";
import { getPublicSiteHost, getPublicSiteUrl } from "@/lib/seo/site-url";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteSeo } from "@/lib/site-settings";

const DISALLOW = ["/admin/", "/api/", "/checkout/", "/cart", "/account/", "/bakim/"];

/** Ürün görselleri /api/media altında — genel /api/ engeli bunları da kapatıyordu */
const GOOGLE_CRAWL_ALLOW = ["/", "/products/", "/api/media/", "/uploads/", "/feeds/", "/_mirror-prebuilt/"];

const GOOGLE_IMAGE_ALLOW = ["/", "/products/", "/api/media/", "/uploads/", "/_mirror-prebuilt/"];

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
  "/_mirror-prebuilt/",
];

/** Eğitim amaçlı tarama — opt-out (llms.txt bunu geçersiz kılmaz) */
const AI_TRAINING_DISALLOW = ["/"];

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

  if (!seo.robotsIndex) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap,
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: "Googlebot", allow: GOOGLE_CRAWL_ALLOW, disallow: DISALLOW },
      { userAgent: "Googlebot-Image", allow: GOOGLE_IMAGE_ALLOW, disallow: ["/admin/", "/api/admin/"] },
      { userAgent: "Bingbot", allow: "/", disallow: DISALLOW },
      { userAgent: "Yandex", allow: "/", disallow: DISALLOW },
      { userAgent: "DuckDuckBot", allow: "/", disallow: DISALLOW },
      { userAgent: "OAI-SearchBot", allow: AI_SEARCH_ALLOW, disallow: DISALLOW },
      { userAgent: "PerplexityBot", allow: AI_SEARCH_ALLOW, disallow: DISALLOW },
      { userAgent: "ClaudeBot", allow: AI_SEARCH_ALLOW, disallow: DISALLOW },
      { userAgent: "Google-Extended", allow: AI_SEARCH_ALLOW, disallow: DISALLOW },
      { userAgent: "GPTBot", disallow: AI_TRAINING_DISALLOW },
      { userAgent: "CCBot", disallow: AI_TRAINING_DISALLOW },
      { userAgent: "anthropic-ai", disallow: AI_TRAINING_DISALLOW },
    ],
    sitemap,
    host: getPublicSiteHost(),
  };
}
