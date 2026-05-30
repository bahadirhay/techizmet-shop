import { NextResponse } from "next/server";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { getSiteBranding, getSiteSeo, parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });
  const settings = parseSiteSettings(site.settingsJson);
  return NextResponse.json({
    branding: getSiteBranding(settings),
    seo: getSiteSeo(settings, site.name),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5555",
    siteName: site.name,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;
  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as { branding?: SiteSettings["branding"]; seo?: SiteSettings["seo"] };
  const current = parseSiteSettings(site.settingsJson);
  const next = mergeSiteSettings(current, {
    branding: body.branding,
    seo: body.seo,
  });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  return NextResponse.json({ ok: true, branding: next.branding, seo: next.seo });
}
