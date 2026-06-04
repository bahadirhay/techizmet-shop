import { NextResponse } from "next/server";
import { parseMaintenanceSettings } from "@/lib/maintenance-mode";
import { parseSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Vitrin + proxy — bakım modu durumu (önbelleksiz) */
export async function GET() {
  const site = await getDefaultSite();
  const row = await prisma.storeSite.findUnique({
    where: { id: site.id },
    select: { settingsJson: true, name: true },
  });
  const settings = parseSiteSettings(row?.settingsJson ?? null);
  const maintenance = parseMaintenanceSettings(settings);

  return NextResponse.json(
    {
      enabled: maintenance.enabled,
      title: maintenance.title,
      message: maintenance.message,
      siteName: row?.name ?? site.name,
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
