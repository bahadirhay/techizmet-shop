import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { normalizeRobotsDisallowPaths } from "@/lib/seo/robots-disallow-paths";
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
  const seoPatch = body.seo ? { ...body.seo } : undefined;
  if (seoPatch && !("staticPages" in (body.seo ?? {}))) {
    delete seoPatch.staticPages;
  }
  if (seoPatch && !("searchIntentMeta" in (body.seo ?? {}))) {
    delete seoPatch.searchIntentMeta;
  }
  if (seoPatch && "robotsDisallowPaths" in seoPatch) {
    seoPatch.robotsDisallowPaths = normalizeRobotsDisallowPaths(seoPatch.robotsDisallowPaths);
  }
  const next = mergeSiteSettings(current, {
    branding: body.branding,
    seo: seoPatch,
  });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  revalidateStorePublicCache(auth.siteId);
  revalidatePath("/robots.txt");
  return NextResponse.json({ ok: true, branding: next.branding, seo: next.seo });
}
