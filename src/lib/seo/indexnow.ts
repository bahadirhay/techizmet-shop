import "server-only";

import { randomUUID } from "crypto";
import { getPublicSiteHost, getPublicSiteUrl } from "@/lib/seo/site-url";
import type { SiteDistributionSettings } from "@/lib/seo/distribution-types";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS_PER_BATCH = 100;

export function ensureIndexNowKey(distribution: SiteDistributionSettings | undefined): string {
  const existing = distribution?.indexNowKey?.trim();
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  return randomUUID();
}

export function indexNowKeyFileName(_key: string): string {
  return "indexnow-key.txt";
}

export function indexNowKeyFileUrl(_key: string): string {
  return `${getPublicSiteUrl()}/indexnow-key.txt`;
}

export async function pingBingSitemap(sitemapUrl?: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const url = sitemapUrl ?? `${getPublicSiteUrl()}/sitemap.xml`;
  const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(pingUrl, { method: "GET", cache: "no-store" });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function submitIndexNowUrls(
  key: string,
  urlList: string[],
): Promise<{ ok: boolean; submitted: number; batches: number; error?: string }> {
  const host = getPublicSiteHost();
  const keyLocation = indexNowKeyFileUrl(key);
  const unique = [...new Set(urlList.filter((u) => u.startsWith("http")))];
  if (!unique.length) {
    return { ok: false, submitted: 0, batches: 0, error: "Gönderilecek URL yok" };
  }

  let batches = 0;
  for (let i = 0; i < unique.length; i += MAX_URLS_PER_BATCH) {
    const chunk = unique.slice(i, i + MAX_URLS_PER_BATCH);
    batches += 1;
    const body = { host, key, keyLocation, urlList: chunk };
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        submitted: i,
        batches,
        error: `IndexNow HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
      };
    }
  }

  return { ok: true, submitted: unique.length, batches };
}

export async function submitIndexNowSingleUrl(key: string, pageUrl: string): Promise<boolean> {
  const result = await submitIndexNowUrls(key, [pageUrl]);
  return result.ok;
}
