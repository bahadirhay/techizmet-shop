import "server-only";

import { fetchGscSearchQueries, gscDateRange, type GscQueryRow } from "@/lib/admin/gsc/client";
import { getGscConfig, type ResolvedGscConfig } from "@/lib/admin/gsc/settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export type GscSyncCache = {
  lastSyncAt: string;
  startDate: string;
  endDate: string;
  days: number;
  rowCount: number;
  queries: GscQueryRow[];
  error?: string;
};

export type GscSyncResult = {
  ok: boolean;
  cached?: GscSyncCache;
  error?: string;
  skipped?: boolean;
  reason?: string;
};

function getOpsGsc(settings: ReturnType<typeof parseSiteSettings>) {
  return settings.ops?.gsc;
}

export async function loadGscSyncCache(siteId: string): Promise<GscSyncCache | null> {
  const site = await prisma.storeSite.findUnique({
    where: { id: siteId },
    select: { settingsJson: true },
  });
  if (!site) return null;
  const settings = parseSiteSettings(site.settingsJson);
  return getOpsGsc(settings) ?? null;
}

export async function syncGscQueries(
  siteId: string,
  options?: { days?: number; force?: boolean },
): Promise<GscSyncResult> {
  const config = await getGscConfig(siteId);
  if (!config.enabled && !options?.force) {
    return { ok: true, skipped: true, reason: "GSC entegrasyonu kapalı" };
  }
  if (!config.credentialsConfigured) {
    return { ok: false, error: "GSC servis hesabı tanımlı değil (.env)" };
  }

  const days = Math.min(90, Math.max(1, options?.days ?? 7));
  const { startDate, endDate } = gscDateRange(days);

  try {
    const queries = await fetchGscSearchQueries({
      property: config.property,
      startDate,
      endDate,
      rowLimit: 500,
    });

    const cache: GscSyncCache = {
      lastSyncAt: new Date().toISOString(),
      startDate,
      endDate,
      days,
      rowCount: queries.length,
      queries: queries.filter((q) => q.query.length >= 2),
    };

    await saveGscCache(siteId, cache);
    return { ok: true, cached: cache };
  } catch (e) {
    const message = e instanceof Error ? e.message : "GSC senkron hatası";
    const cache: GscSyncCache = {
      lastSyncAt: new Date().toISOString(),
      startDate,
      endDate,
      days,
      rowCount: 0,
      queries: [],
      error: message,
    };
    await saveGscCache(siteId, cache);
    return { ok: false, error: message, cached: cache };
  }
}

async function saveGscCache(siteId: string, cache: GscSyncCache) {
  const site = await prisma.storeSite.findUnique({
    where: { id: siteId },
    select: { settingsJson: true },
  });
  if (!site) return;

  const current = parseSiteSettings(site.settingsJson);
  const next = mergeSiteSettings(current, {
    ops: {
      ...current.ops,
      gsc: cache,
    },
  });

  await prisma.storeSite.update({
    where: { id: siteId },
    data: { settingsJson: JSON.stringify(next) },
  });
}

export function gscQueriesToMap(
  cache: GscSyncCache | null,
  config: ResolvedGscConfig,
): Map<string, { clicks: number; impressions: number; position: number }> {
  const map = new Map<string, { clicks: number; impressions: number; position: number }>();
  if (!cache?.queries?.length || !config.includeInBlogTopics) return map;

  for (const row of cache.queries) {
    const keyword = row.query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (keyword.length < 2) continue;
    if (row.clicks < config.minClicks) continue;
    const prev = map.get(keyword);
    if (!prev || row.clicks > prev.clicks) {
      map.set(keyword, {
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
      });
    }
  }
  return map;
}
