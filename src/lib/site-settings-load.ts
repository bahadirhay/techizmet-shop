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
export async function getSiteSettingsUncached(siteId: string): Promise<SiteSettings> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  return parseSettingsJson(site?.settingsJson ?? null);
}
