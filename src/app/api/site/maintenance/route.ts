import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { storeSettingsTag } from "@/lib/cache/store-cache";
import { parseMaintenanceSettings } from "@/lib/maintenance-mode";
import { parseSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

async function loadMaintenanceStatus(siteId: string) {
  const row = await prisma.storeSite.findUnique({
    where: { id: siteId },
    select: { settingsJson: true, name: true },
  });
  const settings = parseSiteSettings(row?.settingsJson ?? null);
  const maintenance = parseMaintenanceSettings(settings);
  return {
    enabled: maintenance.enabled,
    title: maintenance.title,
    message: maintenance.message,
    siteName: row?.name ?? "",
  };
}

const getCachedMaintenanceStatus = (siteId: string) =>
  unstable_cache(() => loadMaintenanceStatus(siteId), ["site-maintenance", siteId], {
    revalidate: 60,
    tags: [storeSettingsTag(siteId)],
  })();

/** Vitrin + proxy — bakım modu durumu */
export async function GET() {
  const site = await getDefaultSite();
  const status = await getCachedMaintenanceStatus(site.id);

  return NextResponse.json(
    {
      enabled: status.enabled,
      title: status.title,
      message: status.message,
      siteName: status.siteName || site.name,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
