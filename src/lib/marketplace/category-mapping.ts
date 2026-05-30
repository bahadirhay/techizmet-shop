import {
  MARKETPLACE_PRISMA_STALE_MSG,
  marketplaceCategoryMappingDb,
} from "@/lib/marketplace/prisma-marketplace";

export async function resolveTrendyolCategoryBrand(
  siteId: string,
  categoryId: string | null,
  fallback: { categoryId: number; brandId: number },
): Promise<{ categoryId: number; brandId: number }> {
  if (!categoryId) return fallback;

  const db = marketplaceCategoryMappingDb();
  if (!db) return fallback;

  const mapping = await db.findFirst({
    where: { siteId, platform: "trendyol", categoryId },
  });

  if (!mapping) return fallback;

  return {
    categoryId: Number(mapping.platformCategoryId) || fallback.categoryId,
    brandId: Number(mapping.platformBrandId ?? fallback.brandId) || fallback.brandId,
  };
}

export async function listCategoryMappings(siteId: string, platform: string) {
  const db = marketplaceCategoryMappingDb();
  if (!db) return [];

  return db.findMany({
    where: { siteId, platform },
    include: { category: { select: { id: true, title: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function upsertCategoryMapping(input: {
  siteId: string;
  platform: string;
  categoryId: string | null;
  platformCategoryId: string;
  platformBrandId?: string | null;
}) {
  const db = marketplaceCategoryMappingDb();
  if (!db) {
    throw new Error(MARKETPLACE_PRISMA_STALE_MSG);
  }

  const categoryId = input.categoryId || null;
  if (categoryId) {
    return db.upsert({
      where: {
        siteId_platform_categoryId: {
          siteId: input.siteId,
          platform: input.platform,
          categoryId,
        },
      },
      create: {
        siteId: input.siteId,
        platform: input.platform,
        categoryId,
        platformCategoryId: input.platformCategoryId.trim(),
        platformBrandId: input.platformBrandId?.trim() || null,
      },
      update: {
        platformCategoryId: input.platformCategoryId.trim(),
        platformBrandId: input.platformBrandId?.trim() || null,
      },
    });
  }

  const existing = await db.findFirst({
    where: { siteId: input.siteId, platform: input.platform, categoryId: null },
  });
  if (existing) {
    return db.update({
      where: { id: existing.id },
      data: {
        platformCategoryId: input.platformCategoryId.trim(),
        platformBrandId: input.platformBrandId?.trim() || null,
      },
    });
  }
  return db.create({
    data: {
      siteId: input.siteId,
      platform: input.platform,
      categoryId: null,
      platformCategoryId: input.platformCategoryId.trim(),
      platformBrandId: input.platformBrandId?.trim() || null,
    },
  });
}
