import { NextResponse } from "next/server";
import { getActiveStreetFoodCampaign, ensureActiveStreetFoodCampaign } from "@/lib/street-food-fund/campaign";
import { getStreetFoodFundSettings } from "@/lib/street-food-fund/settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { formatFoodFundKg } from "@/lib/street-food-fund/format";

export async function GET() {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  const cfg = getStreetFoodFundSettings(settings);
  const campaign = await getActiveStreetFoodCampaign(auth.siteId);

  const [contributions, donations, totalContributions] = await Promise.all([
    prisma.streetFoodContribution.findMany({
      where: { siteId: auth.siteId, ...(campaign ? { campaignId: campaign.id } : {}) },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { order: { select: { orderNumber: true } } },
    }),
    prisma.streetFoodDonation.findMany({
      where: { siteId: auth.siteId },
      orderBy: { donatedAt: "desc" },
      take: 20,
    }),
    prisma.streetFoodContribution.aggregate({
      where: { siteId: auth.siteId, ...(campaign ? { campaignId: campaign.id } : {}) },
      _sum: { grams: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({
    settings: cfg,
    campaign,
    contributions: contributions.map((c) => ({
      id: c.id,
      orderNumber: c.order.orderNumber,
      grams: c.grams,
      gramsLabel: `${c.grams.toLocaleString("tr-TR")} g`,
      createdAt: c.createdAt.toISOString(),
    })),
    donations: donations.map((d) => ({
      id: d.id,
      recipientName: d.recipientName,
      gramsDelivered: d.gramsDelivered,
      gramsLabel: `${formatFoodFundKg(d.gramsDelivered)} kg`,
      donatedAt: d.donatedAt.toISOString(),
      published: d.published,
      videoUrl: d.videoUrl,
      photoUrlsJson: d.photoUrlsJson,
      storyHtml: d.storyHtml,
      campaignId: d.campaignId,
    })),
    stats: {
      orderCount: totalContributions._count,
      totalGrams: totalContributions._sum.grams ?? 0,
    },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as {
    settings?: Record<string, unknown>;
    campaign?: { targetGrams?: number; status?: string };
    startNewCampaign?: boolean;
  };

  const current = parseSiteSettings(site.settingsJson);
  let next = current;

  if (body.settings) {
    next = mergeSiteSettings(current, {
      streetFoodFund: {
        ...current.streetFoodFund,
        ...body.settings,
      },
    });
  }

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  const cfg = getStreetFoodFundSettings(next);
  if (body.settings && (body.settings as { enabled?: boolean }).enabled === true) {
    await ensureActiveStreetFoodCampaign(auth.siteId, cfg);
  }

  if (body.startNewCampaign && cfg.enabled) {
    const active = await getActiveStreetFoodCampaign(auth.siteId);
    if (active) {
      await prisma.streetFoodCampaign.update({
        where: { id: active.id },
        data: { status: "closed", completedAt: new Date() },
      });
    }
    await ensureActiveStreetFoodCampaign(auth.siteId, cfg);
  }

  if (body.campaign?.targetGrams && body.campaign.targetGrams > 0) {
    const active = await getActiveStreetFoodCampaign(auth.siteId);
    if (active) {
      await prisma.streetFoodCampaign.update({
        where: { id: active.id },
        data: { targetGrams: Math.round(body.campaign.targetGrams) },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
