import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { SiteSettings } from "@/lib/site-settings";

export const STORE_PUBLIC_REVALIDATE_SEC = 300;

function parseSettingsJson(raw: string | null | undefined): SiteSettings {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return {};
  }
}

export function storeSettingsTag(siteId: string) {
  return `store-settings:${siteId}`;
}

export function storeNavTag(siteId: string) {
  return `store-nav:${siteId}`;
}

export function storeMirrorTag(siteId: string) {
  return `store-mirror:${siteId}`;
}

export function getCachedStoreSiteBySlug(slug: string, databaseUrl?: string) {
  const dbKey = databaseUrl?.trim() || "default";
  return unstable_cache(
    async () => {
      const { getPrismaForDatabaseUrl } = await import("@/lib/prisma");
      const client = getPrismaForDatabaseUrl(databaseUrl);
      const site = await client.storeSite.findUnique({ where: { slug } });
      if (!site) {
        throw new Error(
          `Mağaza bulunamadı (slug="${slug}"). Önce: npm run db:push && npm run store:provision -- --slug=${slug}`,
        );
      }
      return site;
    },
    ["store-site-by-slug", slug, dbKey],
    { revalidate: STORE_PUBLIC_REVALIDATE_SEC, tags: [`store-slug:${slug}`] },
  )();
}

export function getCachedParsedSiteSettings(siteId: string): Promise<SiteSettings> {
  return unstable_cache(
    async () => {
      const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
      return parseSettingsJson(site?.settingsJson ?? null);
    },
    ["store-settings", siteId],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId)],
    },
  )();
}
