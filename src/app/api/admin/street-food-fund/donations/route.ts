import { NextResponse } from "next/server";
import { ensureActiveStreetFoodCampaign, getActiveStreetFoodCampaign } from "@/lib/street-food-fund/campaign";
import { getStreetFoodFundSettings } from "@/lib/street-food-fund/settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function parsePhotoUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export async function POST(req: Request) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    campaignId?: string;
    recipientName?: string;
    gramsDelivered?: number;
    storyHtml?: string;
    photoUrls?: string[] | string;
    videoUrl?: string;
    donatedAt?: string;
    publish?: boolean;
    startNextCampaign?: boolean;
  };

  const recipientName = String(body.recipientName ?? "").trim();
  const gramsDelivered = Math.round(Number(body.gramsDelivered) || 0);
  if (!recipientName || gramsDelivered <= 0) {
    return NextResponse.json({ error: "Alıcı adı ve gramaj gerekli" }, { status: 400 });
  }

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  const cfg = getStreetFoodFundSettings(settings);

  let campaignId = body.campaignId?.trim();
  if (!campaignId) {
    const active = await getActiveStreetFoodCampaign(auth.siteId);
    campaignId = active?.id;
  }
  if (!campaignId) {
    return NextResponse.json({ error: "Aktif kampanya yok" }, { status: 400 });
  }

  const donatedAt = body.donatedAt ? new Date(body.donatedAt) : new Date();
  const photoUrls = parsePhotoUrls(body.photoUrls);
  const publish = body.publish === true;

  const donation = await prisma.streetFoodDonation.create({
    data: {
      siteId: auth.siteId,
      campaignId,
      recipientName,
      gramsDelivered,
      storyHtml: body.storyHtml?.trim() || null,
      photoUrlsJson: photoUrls.length ? JSON.stringify(photoUrls) : null,
      videoUrl: body.videoUrl?.trim() || null,
      donatedAt: Number.isNaN(donatedAt.getTime()) ? new Date() : donatedAt,
      published: publish,
      publishedAt: publish ? new Date() : null,
    },
  });

  if (publish) {
    await prisma.streetFoodCampaign.update({
      where: { id: campaignId },
      data: { status: "closed", completedAt: new Date() },
    });
    if (body.startNextCampaign !== false && cfg.enabled) {
      await ensureActiveStreetFoodCampaign(auth.siteId, cfg);
    }
  }

  return NextResponse.json({ donation });
}
