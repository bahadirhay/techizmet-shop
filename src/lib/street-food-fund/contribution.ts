import "server-only";

import { getSiteSettings } from "@/lib/site-settings";
import { ensureActiveStreetFoodCampaign } from "@/lib/street-food-fund/campaign";
import { getStreetFoodFundSettings } from "@/lib/street-food-fund/settings";
import { prisma } from "@/lib/prisma";

export async function calculateOrderContributionGrams(orderId: string, siteId: string): Promise<number> {
  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: {
      lines: {
        include: {
          product: { select: { weightGrams: true } },
        },
      },
    },
  });
  if (!order) return 0;

  let total = 0;
  for (const line of order.lines) {
    const weight = line.product?.weightGrams ?? 0;
    if (weight > 0) total += line.qty * weight;
  }
  return total;
}

/** Ödeme onaylandığında mama fonuna gram ekle (idempotent) */
export async function recordStreetFoodContributionOnPayment(
  siteId: string,
  orderId: string,
): Promise<{ grams: number; recorded: boolean }> {
  const settings = await getSiteSettings(siteId);
  const cfg = getStreetFoodFundSettings(settings);
  if (!cfg.enabled) return { grams: 0, recorded: false };

  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    select: {
      id: true,
      paymentStatus: true,
      marketplacePlatform: true,
    },
  });
  if (!order || order.paymentStatus !== "paid") return { grams: 0, recorded: false };
  if (order.marketplacePlatform && !cfg.includeMarketplaceOrders) {
    return { grams: 0, recorded: false };
  }

  const existing = await prisma.streetFoodContribution.findUnique({
    where: { orderId },
    select: { grams: true },
  });
  if (existing) return { grams: existing.grams, recorded: false };

  const grams = await calculateOrderContributionGrams(orderId, siteId);
  if (grams <= 0) return { grams: 0, recorded: false };

  const campaign = await ensureActiveStreetFoodCampaign(siteId, cfg);
  if (campaign.status === "closed") return { grams: 0, recorded: false };

  await prisma.$transaction(async (tx) => {
    await tx.streetFoodContribution.create({
      data: { siteId, campaignId: campaign.id, orderId, grams, source: "order" },
    });

    const updated = await tx.streetFoodCampaign.update({
      where: { id: campaign.id },
      data: { collectedGrams: { increment: grams } },
    });

    if (
      updated.collectedGrams >= updated.targetGrams &&
      updated.status === "active"
    ) {
      await tx.streetFoodCampaign.update({
        where: { id: campaign.id },
        data: { status: "goal_reached", completedAt: new Date() },
      });
    }
  });

  return { grams, recorded: true };
}

/** Admin — kumbaraya manuel gram ekle */
export async function recordManualStreetFoodContribution(
  siteId: string,
  grams: number,
  note?: string,
): Promise<{ grams: number; recorded: boolean }> {
  const settings = await getSiteSettings(siteId);
  const cfg = getStreetFoodFundSettings(settings);
  if (!cfg.enabled) return { grams: 0, recorded: false };

  const rounded = Math.round(grams);
  if (rounded <= 0) return { grams: 0, recorded: false };

  const campaign = await ensureActiveStreetFoodCampaign(siteId, cfg);
  if (campaign.status === "closed") return { grams: 0, recorded: false };

  const trimmedNote = note?.trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.streetFoodContribution.create({
      data: {
        siteId,
        campaignId: campaign.id,
        grams: rounded,
        source: "manual",
        manualNote: trimmedNote,
      },
    });

    const updated = await tx.streetFoodCampaign.update({
      where: { id: campaign.id },
      data: { collectedGrams: { increment: rounded } },
    });

    if (
      updated.collectedGrams >= updated.targetGrams &&
      updated.status === "active"
    ) {
      await tx.streetFoodCampaign.update({
        where: { id: campaign.id },
        data: { status: "goal_reached", completedAt: new Date() },
      });
    }
  });

  return { grams: rounded, recorded: true };
}
