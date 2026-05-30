import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BulkPricingReference = "sale" | "compareAt" | "base";
export type BulkPricingMode = "percent" | "fixed_minor" | "set_minor";
export type BulkPricingRound = "none" | "99" | "90" | "10";

export type BulkPricingFilter = {
  categoryIds?: string[];
  collectionIds?: string[];
  brandIds?: string[];
  productIds?: string[];
  stockMin?: number | null;
  stockMax?: number | null;
  publishedOnly?: boolean;
};

export type BulkPricingAdjustment = {
  reference: BulkPricingReference;
  mode: BulkPricingMode;
  /** percent: −20 = %20 indirim, +10 = %10 zam; fixed_minor: kuruş; set_minor: mutlak satış fiyatı */
  value: number;
  roundTo?: BulkPricingRound;
  /** Maliyet altına inen satırları atla (true) veya maliyet+marj'a çek (false) */
  skipBelowMinMargin?: boolean;
  minMarginPercent?: number;
};

export type BulkPricingPreviewRow = {
  productId: string;
  variantId: string | null;
  title: string;
  variantLabel: string | null;
  sku: string | null;
  stockQty: number;
  referenceMinor: number;
  oldPriceMinor: number;
  newPriceMinor: number;
  oldCompareAtMinor: number | null;
  newCompareAtMinor: number | null;
  costMinor: number | null;
  skipped: boolean;
  skipReason: string | null;
};

export type BulkPricingPreviewResult = {
  rows: BulkPricingPreviewRow[];
  productCount: number;
  lineCount: number;
  changedCount: number;
  skippedCount: number;
};

type PriceTarget = {
  productId: string;
  variantId: string | null;
  title: string;
  variantLabel: string | null;
  sku: string | null;
  stockQty: number;
  priceMinor: number;
  compareAtMinor: number | null;
  basePriceMinor: number | null;
  costMinor: number | null;
};

const productInclude = {
  category: { select: { title: true } },
  collection: { select: { title: true } },
  variants: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.StoreProductInclude;

function referenceMinor(target: PriceTarget, reference: BulkPricingReference): number | null {
  if (reference === "compareAt") {
    return target.compareAtMinor != null && target.compareAtMinor > 0
      ? target.compareAtMinor
      : null;
  }
  if (reference === "base") {
    return target.basePriceMinor ?? target.priceMinor;
  }
  return target.priceMinor;
}

export function roundPriceMinor(minor: number, roundTo: BulkPricingRound = "none"): number {
  if (roundTo === "none" || minor <= 0) return Math.max(0, minor);
  const tl = minor / 100;
  if (roundTo === "99") {
    const whole = Math.max(0, Math.floor(tl));
    return whole * 100 + 99;
  }
  if (roundTo === "90") {
    const whole = Math.max(0, Math.floor(tl));
    return whole * 100 + 90;
  }
  if (roundTo === "10") {
    return Math.max(0, Math.round(tl / 10) * 10 * 100);
  }
  return minor;
}

export function computeNewPriceMinor(
  reference: number,
  adjustment: BulkPricingAdjustment,
): number {
  let next = reference;
  if (adjustment.mode === "percent") {
    next = Math.round(reference * (1 + adjustment.value / 100));
  } else if (adjustment.mode === "fixed_minor") {
    next = reference + Math.round(adjustment.value);
  } else if (adjustment.mode === "set_minor") {
    next = Math.round(adjustment.value);
  }
  next = Math.max(0, next);
  return roundPriceMinor(next, adjustment.roundTo ?? "none");
}

function buildProductWhere(siteId: string, filter: BulkPricingFilter): Prisma.StoreProductWhereInput {
  const and: Prisma.StoreProductWhereInput[] = [{ siteId }];

  if (filter.publishedOnly !== false) {
    and.push({ published: true });
  }

  if (filter.productIds?.length) {
    and.push({ id: { in: filter.productIds } });
  }

  if (filter.categoryIds?.length) {
    and.push({
      OR: [
        { categoryId: { in: filter.categoryIds } },
        { categoryLinks: { some: { categoryId: { in: filter.categoryIds } } } },
      ],
    });
  }

  if (filter.collectionIds?.length) {
    and.push({ collectionId: { in: filter.collectionIds } });
  }

  if (filter.brandIds?.length) {
    and.push({ brandId: { in: filter.brandIds } });
  }

  if (filter.stockMin != null && !Number.isNaN(filter.stockMin)) {
    and.push({ stockQty: { gte: filter.stockMin } });
  }

  if (filter.stockMax != null && !Number.isNaN(filter.stockMax)) {
    and.push({ stockQty: { lte: filter.stockMax } });
  }

  return { AND: and };
}

function flattenTargets(
  products: Prisma.StoreProductGetPayload<{ include: typeof productInclude }>[],
): PriceTarget[] {
  const out: PriceTarget[] = [];
  for (const p of products) {
    if (p.variants.length) {
      for (const v of p.variants) {
        out.push({
          productId: p.id,
          variantId: v.id,
          title: p.title,
          variantLabel: v.label,
          sku: v.sku ?? p.sku,
          stockQty: v.stockQty,
          priceMinor: v.priceMinor,
          compareAtMinor: v.compareAtMinor,
          basePriceMinor: v.basePriceMinor,
          costMinor: p.costMinor,
        });
      }
    } else {
      out.push({
        productId: p.id,
        variantId: null,
        title: p.title,
        variantLabel: null,
        sku: p.sku,
        stockQty: p.stockQty,
        priceMinor: p.priceMinor,
        compareAtMinor: p.compareAtMinor,
        basePriceMinor: p.basePriceMinor,
        costMinor: p.costMinor,
      });
    }
  }
  return out;
}

function previewRow(
  target: PriceTarget,
  adjustment: BulkPricingAdjustment,
): BulkPricingPreviewRow {
  const ref = referenceMinor(target, adjustment.reference);
  const oldPriceMinor = target.priceMinor;
  const oldCompareAtMinor = target.compareAtMinor;

  if (ref == null || ref <= 0) {
    return {
      productId: target.productId,
      variantId: target.variantId,
      title: target.title,
      variantLabel: target.variantLabel,
      sku: target.sku,
      stockQty: target.stockQty,
      referenceMinor: 0,
      oldPriceMinor,
      newPriceMinor: oldPriceMinor,
      oldCompareAtMinor,
      newCompareAtMinor: oldCompareAtMinor,
      costMinor: target.costMinor,
      skipped: true,
      skipReason:
        adjustment.reference === "compareAt"
          ? "Liste fiyatı yok"
          : "Referans fiyat geçersiz",
    };
  }

  let newPriceMinor = computeNewPriceMinor(ref, adjustment);
  let skipped = false;
  let skipReason: string | null = null;

  const minMargin = adjustment.minMarginPercent ?? 0;
  if (target.costMinor != null && minMargin > 0) {
    const floor = Math.round(target.costMinor * (1 + minMargin / 100));
    if (newPriceMinor < floor) {
      if (adjustment.skipBelowMinMargin !== false) {
        skipped = true;
        skipReason = `Maliyet + %${minMargin} altında (${(floor / 100).toFixed(2)} TL)`;
        newPriceMinor = oldPriceMinor;
      } else {
        newPriceMinor = floor;
      }
    }
  }

  if (!skipped && newPriceMinor === oldPriceMinor) {
    skipped = true;
    skipReason = "Değişiklik yok";
  }

  let newCompareAtMinor = oldCompareAtMinor;
  if (
    !skipped &&
    oldCompareAtMinor != null &&
    oldCompareAtMinor > 0 &&
    newPriceMinor >= oldCompareAtMinor
  ) {
    newCompareAtMinor = null;
  }

  return {
    productId: target.productId,
    variantId: target.variantId,
    title: target.title,
    variantLabel: target.variantLabel,
    sku: target.sku,
    stockQty: target.stockQty,
    referenceMinor: ref,
    oldPriceMinor,
    newPriceMinor,
    oldCompareAtMinor,
    newCompareAtMinor,
    costMinor: target.costMinor,
    skipped,
    skipReason,
  };
}

export async function previewBulkPricing(
  siteId: string,
  filter: BulkPricingFilter,
  adjustment: BulkPricingAdjustment,
  db: PrismaClient = prisma,
): Promise<BulkPricingPreviewResult> {
  const products = await db.storeProduct.findMany({
    where: buildProductWhere(siteId, filter),
    include: productInclude,
    orderBy: { title: "asc" },
  });

  const targets = flattenTargets(products);
  const rows = targets.map((t) => previewRow(t, adjustment));
  const productIds = new Set(rows.map((r) => r.productId));

  return {
    rows,
    productCount: productIds.size,
    lineCount: rows.length,
    changedCount: rows.filter((r) => !r.skipped).length,
    skippedCount: rows.filter((r) => r.skipped).length,
  };
}

async function syncProductPriceFromVariants(
  tx: Prisma.TransactionClient,
  productId: string,
) {
  const variants = await tx.storeProductVariant.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
  });
  if (!variants.length) return;

  const defaultV = variants.find((v) => v.isDefault) ?? variants[0]!;
  let minPrice = defaultV.priceMinor;
  let compareAt: number | null = defaultV.compareAtMinor;
  for (const v of variants) {
    if (v.priceMinor < minPrice) {
      minPrice = v.priceMinor;
      compareAt = v.compareAtMinor;
    }
  }

  await tx.storeProduct.update({
    where: { id: productId },
    data: {
      priceMinor: minPrice,
      compareAtMinor: compareAt,
      basePriceMinor: defaultV.basePriceMinor ?? undefined,
    },
  });
}

export async function applyBulkPricing(
  siteId: string,
  staffUserId: string | null,
  filter: BulkPricingFilter,
  adjustment: BulkPricingAdjustment,
  label?: string | null,
  db: PrismaClient = prisma,
): Promise<{ batchId: string; preview: BulkPricingPreviewResult }> {
  const preview = await previewBulkPricing(siteId, filter, adjustment, db);
  const toApply = preview.rows.filter((r) => !r.skipped);

  const batch = await db.$transaction(async (tx) => {
    const created = await tx.storePriceChangeBatch.create({
      data: {
        siteId,
        staffUserId,
        label: label?.trim() || null,
        filterJson: JSON.stringify(filter),
        adjustmentJson: JSON.stringify(adjustment),
        productCount: preview.productCount,
        lineCount: preview.lineCount,
      },
    });

    const touchedProducts = new Set<string>();

    for (const row of preview.rows) {
      await tx.storePriceChangeItem.create({
        data: {
          batchId: created.id,
          productId: row.productId,
          variantId: row.variantId,
          oldPriceMinor: row.oldPriceMinor,
          newPriceMinor: row.newPriceMinor,
          oldCompareAtMinor: row.oldCompareAtMinor,
          newCompareAtMinor: row.newCompareAtMinor,
          skipped: row.skipped,
          skipReason: row.skipReason,
        },
      });

      if (row.skipped) continue;

      if (row.variantId) {
        const variant = await tx.storeProductVariant.findUnique({
          where: { id: row.variantId },
        });
        await tx.storeProductVariant.update({
          where: { id: row.variantId },
          data: {
            basePriceMinor: variant?.basePriceMinor ?? row.oldPriceMinor,
            priceMinor: row.newPriceMinor,
            compareAtMinor: row.newCompareAtMinor,
          },
        });
        touchedProducts.add(row.productId);
      } else {
        const product = await tx.storeProduct.findUnique({ where: { id: row.productId } });
        await tx.storeProduct.update({
          where: { id: row.productId },
          data: {
            basePriceMinor: product?.basePriceMinor ?? row.oldPriceMinor,
            priceMinor: row.newPriceMinor,
            compareAtMinor: row.newCompareAtMinor,
          },
        });
      }
    }

    for (const productId of touchedProducts) {
      await syncProductPriceFromVariants(tx, productId);
    }

    return created;
  });

  return { batchId: batch.id, preview };
}

export async function revertBulkPricingBatch(
  siteId: string,
  batchId: string,
  db: PrismaClient = prisma,
): Promise<{ ok: boolean; error?: string }> {
  const batch = await db.storePriceChangeBatch.findFirst({
    where: { id: batchId, siteId },
    include: { items: true },
  });

  if (!batch) return { ok: false, error: "Kayıt bulunamadı" };
  if (batch.revertedAt) return { ok: false, error: "Bu batch zaten geri alınmış" };

  await db.$transaction(async (tx) => {
    const touchedProducts = new Set<string>();

    for (const item of batch.items) {
      if (item.skipped) continue;

      if (item.variantId) {
        await tx.storeProductVariant.update({
          where: { id: item.variantId },
          data: {
            priceMinor: item.oldPriceMinor,
            compareAtMinor: item.oldCompareAtMinor,
          },
        });
        touchedProducts.add(item.productId);
      } else {
        await tx.storeProduct.update({
          where: { id: item.productId },
          data: {
            priceMinor: item.oldPriceMinor,
            compareAtMinor: item.oldCompareAtMinor,
          },
        });
      }
    }

    for (const productId of touchedProducts) {
      await syncProductPriceFromVariants(tx, productId);
    }

    await tx.storePriceChangeBatch.update({
      where: { id: batchId },
      data: { revertedAt: new Date() },
    });
  });

  return { ok: true };
}

export function parseBulkPricingFilter(raw: unknown): BulkPricingFilter | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const filter: BulkPricingFilter = {};

  if (Array.isArray(o.categoryIds)) {
    filter.categoryIds = o.categoryIds.filter((x) => typeof x === "string");
  }
  if (Array.isArray(o.collectionIds)) {
    filter.collectionIds = o.collectionIds.filter((x) => typeof x === "string");
  }
  if (Array.isArray(o.brandIds)) {
    filter.brandIds = o.brandIds.filter((x) => typeof x === "string");
  }
  if (Array.isArray(o.productIds)) {
    filter.productIds = o.productIds.filter((x) => typeof x === "string");
  }
  if (o.stockMin != null && o.stockMin !== "") {
    const n = parseInt(String(o.stockMin), 10);
    if (!Number.isNaN(n)) filter.stockMin = n;
  }
  if (o.stockMax != null && o.stockMax !== "") {
    const n = parseInt(String(o.stockMax), 10);
    if (!Number.isNaN(n)) filter.stockMax = n;
  }
  if (o.publishedOnly === false) filter.publishedOnly = false;

  const hasScope =
    (filter.categoryIds?.length ?? 0) > 0 ||
    (filter.collectionIds?.length ?? 0) > 0 ||
    (filter.brandIds?.length ?? 0) > 0 ||
    (filter.productIds?.length ?? 0) > 0 ||
    filter.stockMin != null ||
    filter.stockMax != null;

  return hasScope ? filter : null;
}

export function parseBulkPricingAdjustment(raw: unknown): BulkPricingAdjustment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const reference = o.reference;
  if (reference !== "sale" && reference !== "compareAt" && reference !== "base") return null;

  const mode = o.mode;
  if (mode !== "percent" && mode !== "fixed_minor" && mode !== "set_minor") return null;

  const value = parseFloat(String(o.value ?? ""));
  if (!Number.isFinite(value)) return null;

  const roundTo = o.roundTo;
  const validRound =
    roundTo === "none" || roundTo === "99" || roundTo === "90" || roundTo === "10"
      ? roundTo
      : "none";

  let minMarginPercent: number | undefined;
  if (o.minMarginPercent != null && o.minMarginPercent !== "") {
    const m = parseFloat(String(o.minMarginPercent));
    if (Number.isFinite(m) && m >= 0) minMarginPercent = m;
  }

  return {
    reference,
    mode,
    value: mode === "percent" ? value : Math.round(value),
    roundTo: validRound,
    skipBelowMinMargin: o.skipBelowMinMargin !== false,
    minMarginPercent,
  };
}
