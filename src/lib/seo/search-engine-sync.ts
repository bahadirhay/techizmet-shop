import "server-only";

import { aiProductsFeedUrl } from "@/lib/seo/ai-products-feed";
import { googleMerchantFeedUrl } from "@/lib/seo/google-merchant-feed";
import { llmsTxtUrl } from "@/lib/seo/llms-builder";
import { blogFeedUrl } from "@/lib/seo/rss-feed";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import type { SiteSettings } from "@/lib/site-settings";

/** IndexNow + sitemap ping ile bildirilecek keşif dosyaları */
export function collectDiscoveryFeedUrls(settings: SiteSettings): string[] {
  const origin = getPublicSiteUrl();
  const gmcToken = settings.googleMerchant?.feedToken?.trim();
  const urls = [
    `${origin}/sitemap.xml`,
    `${origin}/robots.txt`,
    llmsTxtUrl(),
    aiProductsFeedUrl(),
    blogFeedUrl(),
    googleMerchantFeedUrl(gmcToken || undefined),
  ];
  return [...new Set(urls.filter((u) => u.startsWith("http")))];
}

export type SitemapPingResult = { ok: boolean; status?: number; error?: string };

export async function pingYandexSitemap(sitemapUrl?: string): Promise<SitemapPingResult> {
  const url = sitemapUrl ?? `${getPublicSiteUrl()}/sitemap.xml`;
  const pingUrl = `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(pingUrl, { method: "GET", cache: "no-store" });
    return { ok: res.ok || res.status === 204, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pingAllSitemaps(sitemapUrl?: string): Promise<{
  bing: SitemapPingResult;
  yandex: SitemapPingResult;
  sitemapUrl: string;
}> {
  const { pingBingSitemap } = await import("@/lib/seo/indexnow");
  const url = sitemapUrl ?? `${getPublicSiteUrl()}/sitemap.xml`;
  const [bing, yandex] = await Promise.all([pingBingSitemap(url), pingYandexSitemap(url)]);
  return { bing, yandex, sitemapUrl: url };
}

/** Tam URL listesi: sayfalar + keşif feed'leri */
export function mergeIndexingUrls(pageUrls: string[], discoveryUrls: string[]): string[] {
  return [...new Set([...pageUrls, ...discoveryUrls].filter((u) => u.startsWith("http")))];
}
