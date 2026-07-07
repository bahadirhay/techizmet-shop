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

export type ProductAttributeOverride = {
  attributeId: number;
  attributeName?: string;
  attributeValueId?: number | null;
  attributeValueName?: string | null;
  customValue?: string | null;
};

/** Üründeki marketplaceAttributesJson içinden bir platformun override'larını okur */
export function parseProductAttributes(
  json: string | null | undefined,
  platform: string,
): ProductAttributeOverride[] {
  if (!json) return [];
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    const arr = obj[platform];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((a) => {
        const o = a as Record<string, unknown>;
        const attributeId = Number(o.attributeId);
        if (!Number.isFinite(attributeId)) return null;
        return {
          attributeId,
          attributeName: o.attributeName != null ? String(o.attributeName) : undefined,
          attributeValueId: o.attributeValueId != null ? Number(o.attributeValueId) : null,
          attributeValueName: o.attributeValueName != null ? String(o.attributeValueName) : null,
          customValue: o.customValue != null ? String(o.customValue) : null,
        } as ProductAttributeOverride;
      })
      .filter((x): x is ProductAttributeOverride => x != null);
  } catch {
    return [];
  }
}

/** Kategori seviyesi + ürün seviyesi özellikleri birleştirir (ürün seviyesi kazanır) */
export function mergeTrendyolAttributes(
  categoryLevel: TrendyolPayloadAttribute[],
  productLevel: ProductAttributeOverride[],
): TrendyolPayloadAttribute[] {
  const byId = new Map<number, TrendyolPayloadAttribute>();
  for (const a of categoryLevel) byId.set(a.attributeId, a);
  for (const p of productLevel) {
    if (p.attributeValueId != null) {
      byId.set(p.attributeId, { attributeId: p.attributeId, attributeValueId: p.attributeValueId });
    } else if (p.customValue?.trim()) {
      byId.set(p.attributeId, {
        attributeId: p.attributeId,
        customAttributeValue: p.customValue.trim(),
      });
    }
  }
  return [...byId.values()];
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
