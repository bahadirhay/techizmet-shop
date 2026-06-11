import { NextResponse } from "next/server";
import {
  parseBlogAutomationSettings,
  toClientBlogAutomationState,
} from "@/lib/admin/blog-automation/settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { getSiteSettings, parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const settings = await getSiteSettings(auth.siteId);
  const resolved = parseBlogAutomationSettings(settings.blogAutomation);

  return NextResponse.json({
    blogAutomation: toClientBlogAutomationState(settings.blogAutomation, resolved),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { blogAutomation?: SiteSettings["blogAutomation"] };
  const patch = body.blogAutomation ?? {};

  const site = await prisma.storeSite.findUnique({
    where: { id: auth.siteId },
    select: { settingsJson: true },
  });
  if (!site) return NextResponse.json({ error: "Site bulunamadı" }, { status: 404 });

  const current = parseSiteSettings(site.settingsJson);
  const next = mergeSiteSettings(current, { blogAutomation: { ...current.blogAutomation, ...patch } });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  const resolved = parseBlogAutomationSettings(next.blogAutomation);
  return NextResponse.json({
    blogAutomation: toClientBlogAutomationState(next.blogAutomation, resolved),
  });
}
