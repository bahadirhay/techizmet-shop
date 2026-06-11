import { NextResponse } from "next/server";
import { getGscConfig } from "@/lib/admin/gsc/settings";
import { loadGscSyncCache } from "@/lib/admin/gsc/sync";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "50") || 50));

  const [config, cache] = await Promise.all([
    getGscConfig(auth.siteId),
    loadGscSyncCache(auth.siteId),
  ]);

  if (!cache?.queries?.length) {
    return NextResponse.json({
      configured: config.credentialsConfigured,
      property: config.property,
      queries: [],
      message: cache?.error ?? "Henüz GSC verisi yok — Senkronize et butonuna basın.",
      cache: cache
        ? {
            lastSyncAt: cache.lastSyncAt,
            startDate: cache.startDate,
            endDate: cache.endDate,
            days: cache.days,
          }
        : null,
    });
  }

  const queries = [...cache.queries]
    .filter((q) => q.clicks >= config.minClicks)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);

  return NextResponse.json({
    configured: config.credentialsConfigured,
    property: config.property,
    queries,
    cache: {
      lastSyncAt: cache.lastSyncAt,
      startDate: cache.startDate,
      endDate: cache.endDate,
      days: cache.days,
      rowCount: cache.rowCount,
      error: cache.error,
    },
  });
}
