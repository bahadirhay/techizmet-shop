import { NextResponse } from "next/server";
import { getActiveStreetFoodCampaign, ensureActiveStreetFoodCampaign } from "@/lib/street-food-fund/campaign";
import { getStreetFoodFundSettings } from "@/lib/street-food-fund/settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { formatFoodFundKg } from "@/lib/street-food-fund/format";
import { Prisma } from "@prisma/client";

type ContributionDto = {
  id: string;
  source: string;
  orderNumber: string | null;
  manualNote: string | null;
  grams: number;
  gramsLabel: string;
  createdAt: string;
};

async function loadContributions(siteId: string, campaignId?: string): Promise<ContributionDto[]> {
  const where = { siteId, ...(campaignId ? { campaignId } : {}) };

  try {
    const rows = await prisma.streetFoodContribution.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { order: { select: { orderNumber: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      source: c.source,
      orderNumber: c.order?.orderNumber ?? null,
      manualNote: c.manualNote,
      grams: c.grams,
      gramsLabel: `${c.grams.toLocaleString("tr-TR")} g`,
      createdAt: c.createdAt.toISOString(),
    }));
  } catch {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        orderId: string | null;
        grams: number;
        createdAt: Date;
        orderNumber: string | null;
      }>
    >`
      SELECT c.id, c."orderId", c.grams, c."createdAt", o."orderNumber"
      FROM shop.street_food_contribution c
      LEFT JOIN shop.store_order o ON o.id = c."orderId"
      WHERE c."siteId" = ${siteId}
      ${campaignId ? Prisma.sql`AND c."campaignId" = ${campaignId}` : Prisma.empty}
      ORDER BY c."createdAt" DESC
      LIMIT 30
    `;
    return rows.map((c) => ({
      id: c.id,
      source: "order",
      orderNumber: c.orderNumber,
      manualNote: null,
      grams: c.grams,
      gramsLabel: `${c.grams.toLocaleString("tr-TR")} g`,
      createdAt: new Date(c.createdAt).toISOString(),
    }));
  }
}

export async function GET() {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
    if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

    const settings = parseSiteSettings(site.settingsJson);
    const cfg = getStreetFoodFundSettings(settings);
    const campaign = await getActiveStreetFoodCampaign(auth.siteId);

    const [contributions, donations, totalContributions] = await Promise.all([
      loadContributions(auth.siteId, campaign?.id),
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
      contributions,
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
  } catch (err) {
    console.error("[street-food-fund/admin] GET failed", err);
    return NextResponse.json({ error: "Mama fonu verileri yüklenemedi" }, { status: 500 });
  }
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
