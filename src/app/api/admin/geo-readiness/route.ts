import { NextResponse } from "next/server";
import { buildGeoReadinessReport } from "@/lib/seo/geo-readiness";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  const report = await buildGeoReadinessReport(auth.siteId, settings, site.name);

  return NextResponse.json(report);
}
