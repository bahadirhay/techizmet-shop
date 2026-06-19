import "server-only";

import { buildStoreSitemapEntries } from "@/lib/seo/sitemap-builder";
import {
  ensureIndexNowKey,
  indexNowKeyFileUrl,
  pingBingSitemap,
  submitIndexNowUrls,
} from "@/lib/seo/indexnow";
import { blogFeedUrl } from "@/lib/seo/rss-feed";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import type { DistributionRunResult, SiteDistributionSettings } from "@/lib/seo/distribution-types";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteDistribution } from "@/lib/seo/distribution-settings";

export async function collectPublicUrlsForIndexing(siteId: string): Promise<string[]> {
  const entries = await buildStoreSitemapEntries(siteId);
  const feed = blogFeedUrl();
  return [...new Set([...entries.map((e) => e.url), feed])];
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

  const sitemapPing = await pingBingSitemap(sitemapUrl);
  if (!sitemapPing.ok) {
    errors.push(`Bing sitemap ping başarısız${sitemapPing.error ? `: ${sitemapPing.error}` : ""}`);
  }

  let urlList: string[] = [];
  try {
    urlList = await collectPublicUrlsForIndexing(siteId);
  } catch (e) {
    errors.push(`URL listesi alınamadı: ${e instanceof Error ? e.message : String(e)}`);
  }

  let indexNow: { ok: boolean; submitted: number; batches: number; error?: string } = {
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
  if (sitemapPing.ok) distribution.lastSitemapPingAt = now;
  if (indexNow.ok) distribution.lastIndexNowAt = now;
  if (sitemapPing.ok && indexNow.ok) distribution.lastFullIndexAt = now;

  const checklist = { ...(distribution.checklist ?? {}) };
  if (sitemapPing.ok) {
    checklist["sitemap-ping"] = { status: "auto", doneAt: now };
  }
  if (indexNow.ok) {
    checklist.indexnow = { status: "auto", doneAt: now };
  }
  checklist["rss-feed"] = { status: "auto", doneAt: now, notes: feedUrl };
  distribution.checklist = checklist;

  return {
    ok: errors.length === 0,
    indexNowKey: key,
    keyFileUrl,
    sitemapPing: { bing: sitemapPing },
    indexNow,
    feedUrl,
    sitemapUrl,
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
  await pingBingSitemap();
}
