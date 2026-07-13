import { NextResponse } from "next/server";
import { regenerateSocialImageForDraft } from "@/lib/admin/social-content/generate";
import { requireStaffApi } from "@/lib/staff-auth";
import { getDefaultSite } from "@/lib/site";
import { getSiteSeo, getSiteSettings } from "@/lib/site-settings";

export const maxDuration = 120;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const siteName = getSiteSeo(settings, site.name).siteTitle;

  const result = await regenerateSocialImageForDraft({
    siteId: auth.siteId,
    siteName,
    draftId: id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Görsel üretilemedi" }, { status: 400 });
  }

  return NextResponse.json(result);
}
