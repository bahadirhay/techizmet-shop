import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { recordStockMovement } from "@/lib/stock/movements";

type Db = PrismaClient | Prisma.TransactionClient;

type ProductRow = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  stockQty: number;
  lowStockThreshold: number;
  kind: string;
  images: { url: string }[];
  variants: Array<{
    id: string;
    label: string;
    sku: string | null;
    stockQty: number;
  }>;
};

function pickProductImageUrl(product: ProductRow): string | null {
  return product.images[0]?.url ?? product.imageUrl ?? null;
}

async function openBalanceIfNeeded(
  tx: Db,
  params: {
    siteId: string;
    stockItemId: string;
    balanceBase: number;
    staffUserId?: string | null;
  },
) {
  if (params.balanceBase <= 0) return;
  await recordStockMovement(tx, {
    siteId: params.siteId,
    stockItemId: params.stockItemId,
    type: "adjustment",
    qtyBase: params.balanceBase,
    refType: "product_sync",
    refId: params.stockItemId,
    lineKey: "opening",
    note: "Ürün kataloğundan açılış",
    staffUserId: params.staffUserId,
  });
}

async function upsertFinishedFromProduct(
  tx: Db,
  siteId: string,
  product: ProductRow,
  variant: ProductRow["variants"][number] | null,
  staffUserId?: string | null,
): Promise<"created" | "updated" | "skipped"> {
  const variantId = variant?.id ?? null;
  const imageUrl = pickProductImageUrl(product);
  const barcode = product.barcode?.trim() || null;
  const targetBalance = Math.max(0, variant?.stockQty ?? product.stockQty);
  const lowStockThreshold = Math.max(0, product.lowStockThreshold);

  const existing = await tx.stockItem.findFirst({
    where: { siteId, productId: product.id, variantId, kind: "finished" },
  });

  if (existing) {
    await tx.stockItem.update({
      where: { id: existing.id },
      data: {
        name: variant ? `${product.title} — ${variant.label}` : product.title,
        sku: variant?.sku ?? product.sku,
        lowStockThreshold,
        imageUrl: existing.imageUrl ?? imageUrl,
        barcode: existing.barcode ?? barcode,
        active: true,
      },
    });
    return "updated";
  }

  const item = await tx.stockItem.create({
    data: {
      siteId,
      name: variant ? `${product.title} — ${variant.label}` : product.title,
      sku: variant?.sku ?? product.sku,
      barcode,
      imageUrl,
      kind: "finished",
      unit: "adet",
      balanceBase: 0,
      lowStockThreshold,
      productId: product.id,
      variantId,
    },
  });

  await openBalanceIfNeeded(tx, {
    siteId,
    stockItemId: item.id,
    balanceBase: targetBalance,
    staffUserId,
  });

  return "created";
}

/** Sitedeki tüm mamul ürünleri stok kartına aktarır (idempotent). */
export async function syncFinishedProductsToStock(
  db: PrismaClient,
  siteId: string,
  opts?: { staffUserId?: string | null },
) {
  const products = await db.storeProduct.findMany({
    where: { siteId, kind: { not: "bundle" } },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      sku: true,
      barcode: true,
      imageUrl: true,
      stockQty: true,
      lowStockThreshold: true,
      kind: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      variants: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, sku: true, stockQty: true },
      },
    },
  });

  let created = 0;
  let updated = 0;

  for (const product of products) {
    if (product.variants.length > 0) {
      for (const variant of product.variants) {
        const result = await db.$transaction(async (tx) =>
          upsertFinishedFromProduct(tx, siteId, product, variant, opts?.staffUserId),
        );
        if (result === "created") created += 1;
        else if (result === "updated") updated += 1;
      }
    } else {
      const result = await db.$transaction(async (tx) =>
        upsertFinishedFromProduct(tx, siteId, product, null, opts?.staffUserId),
      );
      if (result === "created") created += 1;
      else if (result === "updated") updated += 1;
    }
  }

  return { created, updated, totalProducts: products.length };
}

/** Tek ürün için mamul kartı oluşturur veya günceller. */
export async function syncSingleProductToStock(
  db: PrismaClient,
  siteId: string,
  productId: string,
  opts?: { staffUserId?: string | null },
) {
  const product = await db.storeProduct.findFirst({
    where: { id: productId, siteId },
    select: {
      id: true,
      title: true,
      sku: true,
      barcode: true,
      imageUrl: true,
      stockQty: true,
      lowStockThreshold: true,
      kind: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      variants: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, sku: true, stockQty: true },
      },
    },
  });
  if (!product || product.kind === "bundle") {
    return { created: 0, updated: 0 };
  }

  let created = 0;
  let updated = 0;
  if (product.variants.length > 0) {
    for (const variant of product.variants) {
      const result = await db.$transaction(async (tx) =>
        upsertFinishedFromProduct(tx, siteId, product, variant, opts?.staffUserId),
      );
      if (result === "created") created += 1;
      else if (result === "updated") updated += 1;
    }
  } else {
    const result = await db.$transaction(async (tx) =>
      upsertFinishedFromProduct(tx, siteId, product, null, opts?.staffUserId),
    );
    if (result === "created") created += 1;
    else if (result === "updated") updated += 1;
  }
  return { created, updated };
}
