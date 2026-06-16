import { NextResponse } from "next/server";
import { ensureActiveStreetFoodCampaign } from "@/lib/street-food-fund/campaign";
import { getStreetFoodFundSettings } from "@/lib/street-food-fund/settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const row = await prisma.streetFoodDonation.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!row) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as { publish?: boolean; startNextCampaign?: boolean };
  if (body.publish !== true) {
    return NextResponse.json({ error: "Yalnızca yayınlama destekleniyor" }, { status: 400 });
  }

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const cfg = getStreetFoodFundSettings(settings);

  await prisma.$transaction(async (tx) => {
    await tx.streetFoodDonation.update({
      where: { id },
      data: { published: true, publishedAt: new Date() },
    });
    await tx.streetFoodCampaign.update({
      where: { id: row.campaignId },
      data: { status: "closed", completedAt: new Date() },
    });
  });

  if (body.startNextCampaign !== false && cfg.enabled) {
    await ensureActiveStreetFoodCampaign(auth.siteId, cfg);
  }

  return NextResponse.json({ ok: true });
}
