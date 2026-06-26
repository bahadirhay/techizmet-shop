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

/* Not: Bing/Google/Yandex anonim "sitemap ping" (GET /ping?sitemap=) protokolünü
   kullanımdan kaldırdı. Sitemap artık IndexNow ile (discovery feed'leri) ve
   robots.txt'deki Sitemap satırıyla bildiriliyor. */

/** Tam URL listesi: sayfalar + keşif feed'leri */
export function mergeIndexingUrls(pageUrls: string[], discoveryUrls: string[]): string[] {
  return [...new Set([...pageUrls, ...discoveryUrls].filter((u) => u.startsWith("http")))];
}
