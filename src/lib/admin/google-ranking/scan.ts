import "server-only";

import { scanSearchIntents, type SearchIntentReport } from "@/lib/admin/search-intent/scan";
import { getGscConfig, type ResolvedGscConfig } from "@/lib/admin/gsc/settings";
import { loadGscSyncCache, type GscSyncCache } from "@/lib/admin/gsc/sync";
import type { GscQueryRow } from "@/lib/admin/gsc/client";
import { getPrimaryGoogleIntents, type SearchIntentTarget } from "@/lib/seo/search-intent";
import { getPublicSiteUrl } from "@/lib/seo/site-url";

export type PrimaryKeywordGscMatch = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  matchKind: "exact" | "contains" | "none";
};

export type PrimaryKeywordRow = {
  intent: SearchIntentTarget;
  report: SearchIntentReport | null;
  gsc: PrimaryKeywordGscMatch;
  landingUrl: string;
};

export type GoogleRankingSnapshot = {
  primary: PrimaryKeywordRow[];
  gsc: {
    config: {
      enabled: boolean;
      property: string;
      credentialsConfigured: boolean;
      serviceAccountEmail: string | null;
    };
    cache: Pick<GscSyncCache, "lastSyncAt" | "startDate" | "endDate" | "days" | "rowCount" | "error"> | null;
    relatedQueries: GscQueryRow[];
  };
  siteOrigin: string;
};

function normalizeQuery(q: string): string {
  return q.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

function matchGscForIntent(intentQuery: string, rows: GscQueryRow[]): PrimaryKeywordGscMatch {
  const target = normalizeQuery(intentQuery);
  if (!target || !rows.length) {
    return { query: intentQuery, clicks: 0, impressions: 0, ctr: 0, position: 0, matchKind: "none" };
  }

  const exact = rows.find((r) => normalizeQuery(r.query) === target);
  if (exact) {
    return {
      query: exact.query,
      clicks: exact.clicks,
      impressions: exact.impressions,
      ctr: exact.ctr,
      position: exact.position,
      matchKind: "exact",
    };
  }

  // Aynı kökten gelen varyasyonlar (örn. "köpek ödül maması fiyat")
  const related = rows
    .filter((r) => {
      const n = normalizeQuery(r.query);
      return n.includes(target) || target.includes(n);
    })
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks);

  if (related[0]) {
    const top = related[0];
    // En iyi pozisyonlu varyasyonu da dikkate al
    const bestPos = [...related].sort((a, b) => a.position - b.position)[0] ?? top;
    return {
      query: bestPos.query,
      clicks: related.reduce((s, r) => s + r.clicks, 0),
      impressions: related.reduce((s, r) => s + r.impressions, 0),
      ctr:
        related.reduce((s, r) => s + r.impressions, 0) > 0
          ? related.reduce((s, r) => s + r.clicks, 0) / related.reduce((s, r) => s + r.impressions, 0)
          : 0,
      position: bestPos.position,
      matchKind: "contains",
    };
  }

  return { query: intentQuery, clicks: 0, impressions: 0, ctr: 0, position: 0, matchKind: "none" };
}

function relatedKeywordQueries(primary: SearchIntentTarget[], rows: GscQueryRow[]): GscQueryRow[] {
  const needles = primary.map((p) => normalizeQuery(p.query));
  return rows
    .filter((r) => {
      const n = normalizeQuery(r.query);
      return needles.some((needle) => n.includes(needle) || needle.includes(n));
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);
}

export async function buildGoogleRankingSnapshot(siteId: string): Promise<GoogleRankingSnapshot> {
  const primaryIntents = getPrimaryGoogleIntents();
  const [intentScan, gscConfig, gscCache] = await Promise.all([
    scanSearchIntents(siteId),
    getGscConfig(siteId),
    loadGscSyncCache(siteId),
  ]);

  const reportsById = new Map(intentScan.reports.map((r) => [r.intent.id, r]));
  const queries = gscCache?.queries ?? [];
  const siteOrigin = getPublicSiteUrl().replace(/\/$/, "");

  const primary: PrimaryKeywordRow[] = primaryIntents.map((intent) => ({
    intent,
    report: reportsById.get(intent.id) ?? null,
    gsc: matchGscForIntent(intent.query, queries),
    landingUrl: `${siteOrigin}${intent.landingPath}`,
  }));

  return {
    primary,
    gsc: {
      config: {
        enabled: gscConfig.enabled,
        property: gscConfig.property,
        credentialsConfigured: gscConfig.credentialsConfigured,
        serviceAccountEmail: gscConfig.serviceAccountEmail,
      },
      cache: gscCache
        ? {
            lastSyncAt: gscCache.lastSyncAt,
            startDate: gscCache.startDate,
            endDate: gscCache.endDate,
            days: gscCache.days,
            rowCount: gscCache.rowCount,
            error: gscCache.error,
          }
        : null,
      relatedQueries: relatedKeywordQueries(primaryIntents, queries),
    },
    siteOrigin,
  };
}

export function toClientGscConfig(config: ResolvedGscConfig) {
  return {
    enabled: config.enabled,
    property: config.property,
    credentialsConfigured: config.credentialsConfigured,
    serviceAccountEmail: config.serviceAccountEmail,
  };
}
