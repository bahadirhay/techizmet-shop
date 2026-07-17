import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { BOX_QR_SOURCE, getBoxQrSettings } from "@/lib/box-qr/settings";
import type { BoxQrCampaignSettings } from "@/lib/box-qr/types";

export async function GET() {
  const auth = await requireStaffApi("store.campaigns");
  if (auth instanceof NextResponse) return auth;

  const settings = await getSiteSettings(auth.siteId);
  const cfg = getBoxQrSettings(settings);
  const now = new Date();
  const [grants, active, redeemed] = await Promise.all([
    prisma.customerPromoGrant.count({ where: { siteId: auth.siteId, source: BOX_QR_SOURCE } }),
    prisma.customerPromoGrant.count({
      where: { siteId: auth.siteId, source: BOX_QR_SOURCE, expiresAt: { gt: now } },
    }),
    prisma.storeCampaign.count({
      where: {
        siteId: auth.siteId,
        description: { startsWith: "box_qr " },
        usedCount: { gt: 0 },
      },
    }),
  ]);

  return NextResponse.json({
    settings: cfg,
    stats: { grants, active, redeemed },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireStaffApi("store.campaigns");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as BoxQrCampaignSettings;
  const site = await prisma.storeSite.findUnique({
    where: { id: auth.siteId },
    select: { settingsJson: true },
  });
  const current = await getSiteSettings(auth.siteId);
  const next = mergeSiteSettings(current, {
    boxQrCampaign: {
      ...current.boxQrCampaign,
      enabled: body.enabled !== false,
      discountPercent: body.discountPercent,
      validityDays: body.validityDays,
      firstOrderOnly: body.firstOrderOnly !== false,
      minCartTry: body.minCartTry,
      headlineTr: body.headlineTr,
      subheadTr: body.subheadTr,
      bodyTr: body.bodyTr,
      ctaTr: body.ctaTr,
      successTr: body.successTr,
      legalTr: body.legalTr,
    },
  });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  void site;
  return NextResponse.json({ ok: true, settings: getBoxQrSettings(next) });
}
