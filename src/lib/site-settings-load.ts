import { prisma } from "@/lib/prisma";
import type { SiteSettings } from "@/lib/site-settings";

function parseSettingsJson(raw: string | null | undefined): SiteSettings {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return {};
  }
}

/** Derleme ve çalışma zamanı — önbelleksiz ayarlar (prebuild betiği ile uyumlu) */
export async function getSiteSettingsUncached(
  siteId: string,
  databaseUrl?: string,
): Promise<SiteSettings> {
  const { getPrismaForDatabaseUrl } = await import("@/lib/prisma");
  const client = databaseUrl ? getPrismaForDatabaseUrl(databaseUrl) : prisma;
  const site = await client.storeSite.findUnique({ where: { id: siteId } });
  return parseSettingsJson(site?.settingsJson ?? null);
}
