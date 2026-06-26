import "server-only";

import { revalidatePath } from "next/cache";
import { buildStoreSitemapEntries } from "@/lib/seo/sitemap-builder";
import {
  ensureIndexNowKey,
  indexNowKeyFileUrl,
  submitIndexNowUrls,
} from "@/lib/seo/indexnow";
import { blogFeedUrl } from "@/lib/seo/rss-feed";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import type { DistributionRunResult, SiteDistributionSettings } from "@/lib/seo/distribution-types";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteDistribution } from "@/lib/seo/distribution-settings";
import {
  collectDiscoveryFeedUrls,
  mergeIndexingUrls,
} from "@/lib/seo/search-engine-sync";

export async function collectPublicUrlsForIndexing(siteId: string): Promise<string[]> {
  const entries = await buildStoreSitemapEntries(siteId);
  const feed = blogFeedUrl();
  return [...new Set([...entries.map((e) => e.url), feed])];
}

export function revalidateSearchDiscoveryPaths(): void {
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
  revalidatePath("/blogs/news/feed.xml");
  revalidatePath("/indexnow-key.txt");
  revalidatePath("/llms.txt");
  revalidatePath("/feeds/products.json");
  revalidatePath("/feeds/google-merchant.xml");
}

export async function runDistributionIndexPass(
  siteId: string,
  settings: SiteSettings,
  options?: { indexNowKey?: string },
): Promise<DistributionRunResult & { distribution: SiteDistributionSettings }> {
  const errors: string[] = [];
  const distribution = { ...getSiteDistribution(settings) };
  const key = options?.indexNowKey?.trim() || ensureIndexNowKey(distribution);
  distribution.indexNowKey = key;

  const sitemapUrl = `${getPublicSiteUrl()}/sitemap.xml`;
  const feedUrl = blogFeedUrl();
  const keyFileUrl = indexNowKeyFileUrl(key);
  const discoveryFeeds = collectDiscoveryFeedUrls(settings);

  revalidateSearchDiscoveryPaths();

  // Not: Bing ve Google, anonim "sitemap ping" (GET /ping?sitemap=) protokolünü
  // 2023'te kullanımdan kaldırdı; bu uçlar artık hata döndürüyor. Sitemap artık
  // IndexNow ile (discoveryFeeds içindeki sitemap.xml) ve robots.txt'deki Sitemap
  // satırıyla bildiriliyor.

  let urlList: string[] = [];
  try {
    const pageUrls = await collectPublicUrlsForIndexing(siteId);
    urlList = mergeIndexingUrls(pageUrls, discoveryFeeds);
  } catch (e) {
    errors.push(`URL listesi alınamadı: ${e instanceof Error ? e.message : String(e)}`);
  }

  let indexNow: DistributionRunResult["indexNow"] = {
    ok: false,
    submitted: 0,
    batches: 0,
  };
  if (urlList.length) {
    indexNow = await submitIndexNowUrls(key, urlList);
    if (!indexNow.ok) {
      errors.push(indexNow.error ?? "IndexNow gönderimi başarısız");
    }
  }

  const now = new Date().toISOString();
  // Sitemap, IndexNow gönderimiyle (discoveryFeeds → sitemap.xml) duyuruluyor.
  const sitemapOk = indexNow.ok;
  if (sitemapOk) distribution.lastSitemapPingAt = now;
  if (indexNow.ok) distribution.lastIndexNowAt = now;
  if (indexNow.ok) distribution.lastFullIndexAt = now;

  const checklist = { ...(distribution.checklist ?? {}) };
  if (sitemapOk) {
    checklist["sitemap-ping"] = {
      status: "auto",
      doneAt: now,
      notes: "IndexNow ile bildirildi",
    };
  }
  if (indexNow.ok) {
    checklist.indexnow = { status: "auto", doneAt: now, notes: `${indexNow.submitted} URL` };
  }
  checklist["rss-feed"] = { status: "auto", doneAt: now, notes: feedUrl };
  checklist["llms-txt"] = { status: "auto", doneAt: now };
  checklist["ai-products-json"] = { status: "auto", doneAt: now };
  distribution.checklist = checklist;

  return {
    ok: errors.length === 0,
    indexNowKey: key,
    keyFileUrl,
    sitemapPing: { bing: { ok: sitemapOk }, yandex: { ok: sitemapOk } },
    indexNow,
    feedUrl,
    sitemapUrl,
    discoveryFeeds,
    errors,
    distribution,
  };
}

export async function notifyPublishedUrl(
  settings: SiteSettings,
  absolutePageUrl: string,
): Promise<void> {
  const distribution = getSiteDistribution(settings);
  const key = ensureIndexNowKey(distribution);
  await submitIndexNowUrls(key, [absolutePageUrl]);
}
