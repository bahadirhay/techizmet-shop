import "server-only";

import { randomUUID } from "crypto";
import { getPublicSiteHost, getPublicSiteUrl } from "@/lib/seo/site-url";
import type { SiteDistributionSettings } from "@/lib/seo/distribution-types";

const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://yandex.com/indexnow",
] as const;
const MAX_URLS_PER_BATCH = 100;

export type IndexNowEndpointResult = {
  endpoint: string;
  ok: boolean;
  status?: number;
  error?: string;
};

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

export async function submitIndexNowUrls(
  key: string,
  urlList: string[],
): Promise<{
  ok: boolean;
  submitted: number;
  batches: number;
  error?: string;
  endpoints?: IndexNowEndpointResult[];
}> {
  const host = getPublicSiteHost();
  const keyLocation = indexNowKeyFileUrl(key);
  const unique = [...new Set(urlList.filter((u) => u.startsWith("http")))];
  if (!unique.length) {
    return { ok: false, submitted: 0, batches: 0, error: "Gönderilecek URL yok" };
  }

  const endpointResults: IndexNowEndpointResult[] = [];
  let batches = 0;

  for (const endpoint of INDEXNOW_ENDPOINTS) {
    let endpointOk = true;
    let endpointError: string | undefined;
    let endpointStatus: number | undefined;

    for (let i = 0; i < unique.length; i += MAX_URLS_PER_BATCH) {
      const chunk = unique.slice(i, i + MAX_URLS_PER_BATCH);
      batches += 1;
      const body = { host, key, keyLocation, urlList: chunk };
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(body),
          cache: "no-store",
        });
        endpointStatus = res.status;
        if (!res.ok && res.status !== 202) {
          const text = await res.text().catch(() => "");
          endpointOk = false;
          endpointError = `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`;
          break;
        }
      } catch (e) {
        endpointOk = false;
        endpointError = e instanceof Error ? e.message : String(e);
        break;
      }
    }

    endpointResults.push({
      endpoint,
      ok: endpointOk,
      status: endpointStatus,
      error: endpointError,
    });
  }

  const ok = endpointResults.some((r) => r.ok);
  const firstError = endpointResults.find((r) => !r.ok)?.error;

  return {
    ok,
    submitted: unique.length,
    batches,
    error: ok ? undefined : firstError ?? "IndexNow gönderimi başarısız",
    endpoints: endpointResults,
  };
}

export async function submitIndexNowSingleUrl(key: string, pageUrl: string): Promise<boolean> {
  const result = await submitIndexNowUrls(key, [pageUrl]);
  return result.ok;
}
