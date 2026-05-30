import "server-only";

import {
  normalizeCommissionPercent,
  normalizeShippingModel,
  type CommissionRuleRow,
  type ResolvedCommissionRule,
} from "@/lib/marketplace/commission-types";
import { marketplaceCommissionRuleDb } from "@/lib/marketplace/prisma-marketplace";

export async function listCommissionRules(
  siteId: string,
  platform: string,
): Promise<CommissionRuleRow[]> {
  const db = marketplaceCommissionRuleDb();
  if (!db) return [];

  const rows = await db.findMany({
    where: { siteId, platform },
    include: { category: { select: { title: true } } },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    categoryId: r.categoryId,
    categoryTitle: r.category?.title ?? (r.categoryId ? null : "Varsayılan (tüm kategoriler)"),
    commissionPercent: r.commissionPercent,
    shippingModel: r.shippingModel,
    shippingFeeMinor: r.shippingFeeMinor,
    notes: r.notes,
  }));
}

export async function resolveCommissionRule(
  siteId: string,
  platform: string,
  categoryId: string | null | undefined,
): Promise<ResolvedCommissionRule> {
  const db = marketplaceCommissionRuleDb();
  const fallback: ResolvedCommissionRule = {
    id: null,
    commissionPercent: 15,
    shippingModel: "marketplace_cargo",
    shippingFeeMinor: 0,
    source: "fallback",
  };
  if (!db) return fallback;

  if (categoryId) {
    const byCategory = await db.findFirst({
      where: { siteId, platform, categoryId },
    });
    if (byCategory) {
      return {
        id: byCategory.id,
        commissionPercent: byCategory.commissionPercent,
        shippingModel: normalizeShippingModel(byCategory.shippingModel),
        shippingFeeMinor: byCategory.shippingFeeMinor,
        source: "category",
      };
    }
  }

  const platformDefault = await db.findFirst({
    where: { siteId, platform, categoryId: null },
    orderBy: { sortOrder: "asc" },
  });
  if (platformDefault) {
    return {
      id: platformDefault.id,
      commissionPercent: platformDefault.commissionPercent,
      shippingModel: normalizeShippingModel(platformDefault.shippingModel),
      shippingFeeMinor: platformDefault.shippingFeeMinor,
      source: "platform_default",
    };
  }

  return fallback;
}

export async function upsertCommissionRule(input: {
  siteId: string;
  platform: string;
  categoryId: string | null;
  commissionPercent: number;
  shippingModel: string;
  shippingFeeMinor: number;
  notes?: string | null;
}) {
  const db = marketplaceCommissionRuleDb();
  if (!db) {
    const { MARKETPLACE_PRISMA_STALE_MSG } = await import("@/lib/marketplace/prisma-marketplace");
    throw new Error(MARKETPLACE_PRISMA_STALE_MSG);
  }

  const categoryId = input.categoryId || null;
  const data = {
    commissionPercent: normalizeCommissionPercent(input.commissionPercent),
    shippingModel: normalizeShippingModel(input.shippingModel),
    shippingFeeMinor: Math.max(0, Math.round(input.shippingFeeMinor)),
    notes: input.notes?.trim() || null,
  };

  if (categoryId) {
    const existing = await db.findFirst({
      where: { siteId: input.siteId, platform: input.platform, categoryId },
    });
    if (existing) {
      return db.update({ where: { id: existing.id }, data });
    }
    return db.create({
      data: {
        siteId: input.siteId,
        platform: input.platform,
        categoryId,
        ...data,
      },
    });
  }

  const existing = await db.findFirst({
    where: { siteId: input.siteId, platform: input.platform, categoryId: null },
  });
  if (existing) {
    return db.update({ where: { id: existing.id }, data });
  }
  return db.create({
    data: {
      siteId: input.siteId,
      platform: input.platform,
      categoryId: null,
      ...data,
    },
  });
}

export async function deleteCommissionRule(siteId: string, id: string): Promise<boolean> {
  const db = marketplaceCommissionRuleDb();
  if (!db) return false;
  const row = await db.findFirst({ where: { id, siteId } });
  if (!row) return false;
  await db.delete({ where: { id } });
  return true;
}

export async function resolveProductCommission(
  siteId: string,
  platform: string,
  categoryId: string | null | undefined,
) {
  return resolveCommissionRule(siteId, platform, categoryId);
}
