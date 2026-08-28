import "server-only";

import type { ShopLocale } from "@/lib/i18n/locale";
import { getSiteSettings } from "@/lib/site-settings";
import { getStreetFoodFundSettings, streetFoodTexts } from "@/lib/street-food-fund/settings";
import { formatFoodFundKg, foodFundProgressPercent } from "@/lib/street-food-fund/format";
import type { StreetFoodFundPublicPayload } from "@/lib/street-food-fund/types";
import { prisma } from "@/lib/prisma";

export async function getActiveStreetFoodCampaign(siteId: string) {
  return prisma.streetFoodCampaign.findFirst({
    where: { siteId, status: { in: ["active", "goal_reached"] } },
    orderBy: { startedAt: "desc" },
  });
}

export async function ensureActiveStreetFoodCampaign(
  siteId: string,
  settings: ReturnType<typeof getStreetFoodFundSettings>,
) {
  const existing = await getActiveStreetFoodCampaign(siteId);
  if (existing) return existing;

  return prisma.streetFoodCampaign.create({
    data: {
      siteId,
      targetGrams: settings.defaultTargetGrams,
      collectedGrams: 0,
      status: "active",
      sloganTr: settings.sloganTr,
      sloganEn: settings.sloganEn,
    },
  });
}

function buildImpactLabel(
  locale: ShopLocale,
  uniqueRecipientCount: number,
  publishedDonationCount: number,
  totalDeliveredGrams: number,
): string | null {
  if (uniqueRecipientCount <= 0 || totalDeliveredGrams <= 0 || publishedDonationCount <= 0) {
    return null;
  }
  const kg = formatFoodFundKg(totalDeliveredGrams, locale === "en" ? "en" : "tr");
  if (locale === "en") {
    const places = uniqueRecipientCount === 1 ? "1 place" : `${uniqueRecipientCount} places`;
    const donations =
      publishedDonationCount === 1 ? "1 donation" : `${publishedDonationCount} donations`;
    return `So far: ${donations} to ${places} · ${kg} kg delivered.`;
  }
  const places = uniqueRecipientCount === 1 ? "1 yere" : `${uniqueRecipientCount} yere`;
  const donations =
    publishedDonationCount === 1 ? "1 bağış" : `${publishedDonationCount} bağış`;
  return `Şimdiye kadar ${places} ${donations} yaptık · toplam ${kg} kg mama.`;
}

async function loadPublishedImpact(siteId: string, locale: ShopLocale) {
  const [agg, recipientGroups] = await Promise.all([
    prisma.streetFoodDonation.aggregate({
      where: { siteId, published: true },
      _count: { _all: true },
      _sum: { gramsDelivered: true },
    }),
    prisma.streetFoodDonation.groupBy({
      by: ["recipientName"],
      where: { siteId, published: true },
    }),
  ]);

  const publishedDonationCount = agg._count._all;
  const uniqueRecipientCount = recipientGroups.length;
  const totalDeliveredGrams = agg._sum.gramsDelivered ?? 0;
  const totalDeliveredLabel = `${formatFoodFundKg(totalDeliveredGrams, locale === "en" ? "en" : "tr")} kg`;
  const impactLabel = buildImpactLabel(
    locale,
    uniqueRecipientCount,
    publishedDonationCount,
    totalDeliveredGrams,
  );

  return {
    publishedDonationCount,
    uniqueRecipientCount,
    totalDeliveredGrams,
    totalDeliveredLabel,
    impactLabel,
  };
}

export async function buildStreetFoodFundPublicPayload(
  siteId: string,
  locale: ShopLocale,
): Promise<StreetFoodFundPublicPayload | null> {
  const settings = await getSiteSettings(siteId);
  const cfg = getStreetFoodFundSettings(settings);
  if (!cfg.enabled) return null;

  const [campaign, impact] = await Promise.all([
    getActiveStreetFoodCampaign(siteId),
    loadPublishedImpact(siteId, locale),
  ]);

  if (!campaign) {
    return {
      enabled: true,
      collectedGrams: 0,
      targetGrams: cfg.defaultTargetGrams,
      progressPercent: 0,
      title: streetFoodTexts(locale, settings).title,
      slogan: streetFoodTexts(locale, settings).slogan,
      counterSubtext: streetFoodTexts(locale, settings).counterSubtext,
      detailHref: cfg.detailPath,
      collectedLabel: `${formatFoodFundKg(0, locale)} kg`,
      targetLabel: `${formatFoodFundKg(cfg.defaultTargetGrams, locale)} kg`,
      ...impact,
    };
  }

  const texts = streetFoodTexts(locale, settings);
  const collectedGrams = campaign.collectedGrams;
  const targetGrams = campaign.targetGrams;

  return {
    enabled: true,
    collectedGrams,
    targetGrams,
    progressPercent: foodFundProgressPercent(collectedGrams, targetGrams),
    title: texts.title,
    slogan: locale === "en" ? campaign.sloganEn || texts.slogan : campaign.sloganTr || texts.slogan,
    counterSubtext: texts.counterSubtext,
    detailHref: cfg.detailPath,
    collectedLabel: `${formatFoodFundKg(collectedGrams, locale)} kg`,
    targetLabel: `${formatFoodFundKg(targetGrams, locale)} kg`,
    ...impact,
  };
}
