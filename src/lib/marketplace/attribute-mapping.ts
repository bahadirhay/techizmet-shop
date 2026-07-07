import {
  MARKETPLACE_PRISMA_STALE_MSG,
  marketplaceCategoryAttributeDb,
} from "@/lib/marketplace/prisma-marketplace";

export type TrendyolPayloadAttribute = {
  attributeId: number;
  attributeValueId?: number;
  customAttributeValue?: string;
};

/** Bir yerel kategori için Trendyol attributes payload'u üretir (kategoriye özel + varsayılan). */
export async function resolveTrendyolAttributes(
  siteId: string,
  categoryId: string | null,
): Promise<TrendyolPayloadAttribute[]> {
  const db = marketplaceCategoryAttributeDb();
  if (!db) return [];

  const rows = await db.findMany({
    where: {
      siteId,
      platform: "trendyol",
      OR: categoryId ? [{ categoryId }, { categoryId: null }] : [{ categoryId: null }],
    },
  });

  // Kategoriye özel eşleme, varsayılanı (categoryId null) ezer.
  const byAttribute = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = byAttribute.get(row.attributeId);
    if (!existing) {
      byAttribute.set(row.attributeId, row);
      continue;
    }
    // categoryId dolu olan öncelikli
    if (existing.categoryId == null && row.categoryId != null) {
      byAttribute.set(row.attributeId, row);
    }
  }

  const out: TrendyolPayloadAttribute[] = [];
  for (const row of byAttribute.values()) {
    if (row.attributeValueId != null) {
      out.push({ attributeId: row.attributeId, attributeValueId: row.attributeValueId });
    } else if (row.customValue?.trim()) {
      out.push({ attributeId: row.attributeId, customAttributeValue: row.customValue.trim() });
    }
  }
  return out;
}

export async function listAttributeMappings(
  siteId: string,
  platform: string,
  categoryId: string | null,
) {
  const db = marketplaceCategoryAttributeDb();
  if (!db) return [];
  return db.findMany({
    where: { siteId, platform, categoryId: categoryId ?? null },
    orderBy: { attributeName: "asc" },
  });
}

export async function upsertAttributeMapping(input: {
  siteId: string;
  platform: string;
  categoryId: string | null;
  attributeId: number;
  attributeName: string;
  attributeValueId?: number | null;
  attributeValueName?: string | null;
  customValue?: string | null;
  required?: boolean;
}) {
  const db = marketplaceCategoryAttributeDb();
  if (!db) throw new Error(MARKETPLACE_PRISMA_STALE_MSG);

  const data = {
    attributeName: input.attributeName,
    attributeValueId: input.attributeValueId ?? null,
    attributeValueName: input.attributeValueName ?? null,
    customValue: input.customValue?.trim() || null,
    required: input.required ?? false,
  };

  return db.upsert({
    where: {
      siteId_platform_categoryId_attributeId: {
        siteId: input.siteId,
        platform: input.platform,
        categoryId: input.categoryId ?? null,
        attributeId: input.attributeId,
      },
    },
    create: {
      siteId: input.siteId,
      platform: input.platform,
      categoryId: input.categoryId ?? null,
      attributeId: input.attributeId,
      ...data,
    },
    update: data,
  });
}

export async function deleteAttributeMapping(input: {
  siteId: string;
  platform: string;
  categoryId: string | null;
  attributeId: number;
}) {
  const db = marketplaceCategoryAttributeDb();
  if (!db) throw new Error(MARKETPLACE_PRISMA_STALE_MSG);
  return db.deleteMany({
    where: {
      siteId: input.siteId,
      platform: input.platform,
      categoryId: input.categoryId ?? null,
      attributeId: input.attributeId,
    },
  });
}
