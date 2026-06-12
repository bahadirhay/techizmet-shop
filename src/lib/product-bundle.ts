/** Paket (bundle) stok ve bileşen mantığı */

import type { Prisma, PrismaClient } from "@prisma/client";
import { pickDefaultVariant } from "@/lib/product-variants";

export const PRODUCT_KIND_STANDARD = "standard";
export const PRODUCT_KIND_BUNDLE = "bundle";

export type BundleComponentInput = {
  productId: string;
  variantId?: string | null;
  qtyPerBundle: number;
};

export type ResolvedBundleComponent = {
  productId: string;
  variantId: string | null;
  qtyPerBundle: number;
  stockQty: number;
  title: string;
  sku: string | null;
};

export type StockDeductionLine = {
  productId: string;
  variantId: string | null;
  qty: number;
};

export type BundleComponentSnapshot = {
  productId: string;
  variantId: string | null;
  title: string;
  sku: string | null;
  qty: number;
  /** Sipariş anı birim maliyet (kuruş) */
  costMinor?: number | null;
};

export type BundleOrderLineMeta = {
  lineKind: string;
  bundleProductId: string | null;
  componentsSnapshotJson: string | null;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export function computeAvailableBundles(
  components: { stockQty: number; qtyPerBundle: number }[],
): number {
  if (!components.length) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const c of components) {
    const q = Math.max(1, c.qtyPerBundle);
    const available = Math.floor(Math.max(0, c.stockQty) / q);
    if (available < min) min = available;
  }
  return Number.isFinite(min) ? min : 0;
}

export function expandBundleStockDeductions(
  components: ResolvedBundleComponent[],
  bundleQty: number,
): StockDeductionLine[] {
  const qty = Math.max(1, bundleQty);
  return components.map((c) => ({
    productId: c.productId,
    variantId: c.variantId,
    qty: c.qtyPerBundle * qty,
  }));
}

export function buildComponentsSnapshot(
  components: ResolvedBundleComponent[],
  bundleQty: number,
  costByProductId?: Map<string, number | null>,
): BundleComponentSnapshot[] {
  const qty = Math.max(1, bundleQty);
  return components.map((c) => ({
    productId: c.productId,
    variantId: c.variantId,
    title: c.title,
    sku: c.sku,
    qty: c.qtyPerBundle * qty,
    costMinor: costByProductId?.get(c.productId) ?? null,
  }));
}

export async function buildComponentsSnapshotForOrder(
  db: DbClient,
  components: ResolvedBundleComponent[],
  bundleQty: number,
): Promise<BundleComponentSnapshot[]> {
  const productIds = [...new Set(components.map((c) => c.productId))];
  const rows = productIds.length
    ? await db.storeProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, costMinor: true },
      })
    : [];
  const costByProductId = new Map(rows.map((r) => [r.id, r.costMinor]));
  return buildComponentsSnapshot(components, bundleQty, costByProductId);
}

export function parseComponentsSnapshotJson(raw: string | null | undefined): BundleComponentSnapshot[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const item = row as Record<string, unknown>;
        const productId = String(item.productId ?? "").trim();
        if (!productId) return null;
        const variantIdRaw = item.variantId != null ? String(item.variantId).trim() : "";
        const snapshot: BundleComponentSnapshot = {
          productId,
          variantId: variantIdRaw || null,
          title: String(item.title ?? "").trim() || productId,
          sku: item.sku != null ? String(item.sku).trim() || null : null,
          qty: Math.max(1, parseInt(String(item.qty ?? 1), 10) || 1),
          costMinor:
            item.costMinor != null ? parseInt(String(item.costMinor), 10) || null : null,
        };
        return snapshot;
      })
      .filter((x): x is BundleComponentSnapshot => x != null);
  } catch {
    return [];
  }
}

export function bundleSnapshotTotalCostMinor(components: BundleComponentSnapshot[]): number | null {
  let total = 0;
  let hasCost = false;
  for (const c of components) {
    if (c.costMinor != null && c.costMinor > 0) {
      total += c.costMinor * c.qty;
      hasCost = true;
    }
  }
  return hasCost ? total : null;
}

export async function buildBundleOrderLineMeta(
  db: DbClient,
  productId: string,
  qty: number,
): Promise<BundleOrderLineMeta> {
  const product = await db.storeProduct.findUnique({
    where: { id: productId },
    select: { kind: true },
  });
  if (product?.kind !== PRODUCT_KIND_BUNDLE) {
    return { lineKind: PRODUCT_KIND_STANDARD, bundleProductId: null, componentsSnapshotJson: null };
  }
  const components = await loadResolvedBundleComponents(db, productId);
  const snapshot = await buildComponentsSnapshotForOrder(db, components, qty);
  return {
    lineKind: PRODUCT_KIND_BUNDLE,
    bundleProductId: productId,
    componentsSnapshotJson: JSON.stringify(snapshot),
  };
}

export async function deductProductStock(
  db: DbClient,
  productId: string,
  qty: number,
  lineTitle: string,
): Promise<{ ok: boolean; componentProductIds: string[] }> {
  const product = await db.storeProduct.findUnique({
    where: { id: productId },
    select: { kind: true },
  });
  if (!product) return { ok: false, componentProductIds: [] };

  const componentProductIds = new Set<string>();

  if (product.kind === PRODUCT_KIND_BUNDLE) {
    const components = await loadResolvedBundleComponents(db, productId);
    const deductions = expandBundleStockDeductions(components, qty);
    for (const d of deductions) {
      if (d.variantId) {
        const updated = await db.storeProductVariant.updateMany({
          where: { id: d.variantId, productId: d.productId, stockQty: { gte: d.qty } },
          data: { stockQty: { decrement: d.qty } },
        });
        if (updated.count === 0) return { ok: false, componentProductIds: [...componentProductIds] };
        const sum = await db.storeProductVariant.aggregate({
          where: { productId: d.productId },
          _sum: { stockQty: true },
        });
        await db.storeProduct.update({
          where: { id: d.productId },
          data: { stockQty: sum._sum.stockQty ?? 0 },
        });
      } else {
        const updated = await db.storeProduct.updateMany({
          where: { id: d.productId, stockQty: { gte: d.qty } },
          data: { stockQty: { decrement: d.qty } },
        });
        if (updated.count === 0) return { ok: false, componentProductIds: [...componentProductIds] };
      }
      componentProductIds.add(d.productId);
    }
    await syncBundlesContainingProducts(db, [...componentProductIds]);
    return { ok: true, componentProductIds: [...componentProductIds] };
  }

  const updated = await db.storeProduct.updateMany({
    where: { id: productId, stockQty: { gte: qty } },
    data: { stockQty: { decrement: qty } },
  });
  if (updated.count === 0) return { ok: false, componentProductIds: [] };
  componentProductIds.add(productId);
  await syncBundlesContainingProducts(db, [productId]);
  return { ok: true, componentProductIds: [productId] };
}

export async function loadResolvedBundleComponents(
  db: DbClient,
  bundleProductId: string,
): Promise<ResolvedBundleComponent[]> {
  const rows = await db.storeBundleComponent.findMany({
    where: { bundleProductId },
    orderBy: { sortOrder: "asc" },
    include: {
      componentProduct: {
        select: { id: true, title: true, sku: true, stockQty: true, kind: true },
      },
      componentVariant: {
        select: { id: true, label: true, sku: true, stockQty: true },
      },
    },
  });

  return rows.map((row) => {
    const variant = row.componentVariant;
    const product = row.componentProduct;
    const stockQty = variant ? variant.stockQty : product.stockQty;
    const sku = variant?.sku ?? product.sku;
    const title = variant ? `${product.title} — ${variant.label}` : product.title;
    return {
      productId: row.componentProductId,
      variantId: row.componentVariantId,
      qtyPerBundle: row.qtyPerBundle,
      stockQty,
      title,
      sku,
    };
  });
}

export async function computeBundleAvailableQty(
  db: DbClient,
  bundleProductId: string,
): Promise<number> {
  const components = await loadResolvedBundleComponents(db, bundleProductId);
  return computeAvailableBundles(components);
}

export async function syncBundleStockCache(db: DbClient, bundleProductId: string): Promise<number> {
  const available = await computeBundleAvailableQty(db, bundleProductId);
  await db.storeProduct.update({
    where: { id: bundleProductId },
    data: { stockQty: available },
  });
  return available;
}

export async function syncBundlesContainingProducts(
  db: DbClient,
  componentProductIds: string[],
): Promise<void> {
  if (!componentProductIds.length) return;
  const rows = await db.storeBundleComponent.findMany({
    where: { componentProductId: { in: componentProductIds } },
    select: { bundleProductId: true },
    distinct: ["bundleProductId"],
  });
  for (const row of rows) {
    await syncBundleStockCache(db, row.bundleProductId);
  }
}

export function parseBundleComponentInputs(raw: unknown): BundleComponentInput[] {
  if (!Array.isArray(raw)) return [];
  const out: BundleComponentInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = String(row.productId ?? "").trim();
    if (!productId) continue;
    const qtyPerBundle = Math.max(1, parseInt(String(row.qtyPerBundle ?? 1), 10) || 1);
    const variantIdRaw = row.variantId != null ? String(row.variantId).trim() : "";
    out.push({
      productId,
      variantId: variantIdRaw || null,
      qtyPerBundle,
    });
  }
  return out;
}

export async function validateBundleComponents(
  db: DbClient,
  siteId: string,
  bundleProductId: string | null,
  inputs: BundleComponentInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!inputs.length) {
    return { ok: false, error: "Paket için en az bir ürün seçin" };
  }

  const productIds = [...new Set(inputs.map((i) => i.productId))];
  const products = await db.storeProduct.findMany({
    where: { siteId, id: { in: productIds } },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  for (const input of inputs) {
    if (bundleProductId && input.productId === bundleProductId) {
      return { ok: false, error: "Paket kendi içinde olamaz" };
    }
    const product = byId.get(input.productId);
    if (!product) {
      return { ok: false, error: "Geçersiz paket bileşeni" };
    }
    if (product.kind === PRODUCT_KIND_BUNDLE) {
      return { ok: false, error: `"${product.title}" bir paket — bileşen olarak eklenemez` };
    }
    if (product.variants.length > 0) {
      if (!input.variantId) {
        return { ok: false, error: `"${product.title}" için varyant seçin` };
      }
      const variant = product.variants.find((v) => v.id === input.variantId);
      if (!variant) {
        return { ok: false, error: `"${product.title}" için geçersiz varyant` };
      }
    } else if (input.variantId) {
      return { ok: false, error: `"${product.title}" varyantsız — varyant seçmeyin` };
    }
    if (input.qtyPerBundle < 1) {
      return { ok: false, error: "Bileşen adedi en az 1 olmalı" };
    }
  }

  return { ok: true };
}

export async function replaceBundleComponents(
  db: DbClient,
  bundleProductId: string,
  inputs: BundleComponentInput[],
): Promise<void> {
  await db.storeBundleComponent.deleteMany({ where: { bundleProductId } });
  if (!inputs.length) return;
  await db.storeBundleComponent.createMany({
    data: inputs.map((input, sortOrder) => ({
      bundleProductId,
      componentProductId: input.productId,
      componentVariantId: input.variantId ?? null,
      qtyPerBundle: input.qtyPerBundle,
      sortOrder,
    })),
  });
}

/** Bileşen ürün seçiminde varsayılan varyantı çöz */
export function resolveComponentVariantId(
  variants: { id: string; isDefault: boolean; sortOrder: number }[],
  variantId: string | null,
): string | null {
  if (!variants.length) return null;
  if (variantId && variants.some((v) => v.id === variantId)) return variantId;
  return pickDefaultVariant(variants)?.id ?? variants[0]?.id ?? null;
}

export function isBundleProduct(kind: string | null | undefined): boolean {
  return kind === PRODUCT_KIND_BUNDLE;
}
