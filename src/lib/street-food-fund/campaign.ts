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

export async function buildStreetFoodFundPublicPayload(
  siteId: string,
  locale: ShopLocale,
): Promise<StreetFoodFundPublicPayload | null> {
  const settings = await getSiteSettings(siteId);
  const cfg = getStreetFoodFundSettings(settings);
  if (!cfg.enabled) return null;

  const campaign = await getActiveStreetFoodCampaign(siteId);
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
  };
}
