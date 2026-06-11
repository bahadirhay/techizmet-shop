import { NextResponse } from "next/server";
import { parseGscSettings, toClientGscState } from "@/lib/admin/gsc/settings";
import { loadGscSyncCache } from "@/lib/admin/gsc/sync";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { getSiteSettings, parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const settings = await getSiteSettings(auth.siteId);
  const resolved = parseGscSettings(settings.gsc);
  const cache = await loadGscSyncCache(auth.siteId);

  return NextResponse.json({
    gsc: toClientGscState(resolved),
    cache: cache
      ? {
          lastSyncAt: cache.lastSyncAt,
          startDate: cache.startDate,
          endDate: cache.endDate,
          days: cache.days,
          rowCount: cache.rowCount,
          error: cache.error,
        }
      : null,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { gsc?: SiteSettings["gsc"] };
  const patch = body.gsc ?? {};

  const site = await prisma.storeSite.findUnique({
    where: { id: auth.siteId },
    select: { settingsJson: true },
  });
  if (!site) return NextResponse.json({ error: "Site bulunamadı" }, { status: 404 });

  const current = parseSiteSettings(site.settingsJson);
  const next = mergeSiteSettings(current, { gsc: { ...current.gsc, ...patch } });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  const resolved = parseGscSettings(next.gsc);
  return NextResponse.json({ gsc: toClientGscState(resolved) });
}
