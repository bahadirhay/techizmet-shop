import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  formatStockBalance,
  type StockUnit,
  invoiceQtyToBase,
} from "@/lib/stock/units";

export type StockMovementType =
  | "purchase"
  | "sale"
  | "production_in"
  | "production_out"
  | "adjustment"
  | "return";

type Db = PrismaClient | Prisma.TransactionClient;

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

async function syncProductStockQty(
  tx: Db,
  item: { productId: string | null; variantId: string | null; balanceBase: number; unit: string },
) {
  if (!item.productId) return;
  const qty = item.unit === "adet" ? item.balanceBase : item.balanceBase; // mamul her zaman adet
  if (item.variantId) {
    await tx.storeProductVariant.update({
      where: { id: item.variantId },
      data: { stockQty: Math.max(0, qty) },
    });
    const sum = await tx.storeProductVariant.aggregate({
      where: { productId: item.productId },
      _sum: { stockQty: true },
    });
    await tx.storeProduct.update({
      where: { id: item.productId },
      data: { stockQty: sum._sum.stockQty ?? 0 },
    });
  } else if (item.unit === "adet") {
    await tx.storeProduct.update({
      where: { id: item.productId },
      data: { stockQty: Math.max(0, qty) },
    });
  }
}

export async function recordStockMovement(
  tx: Db,
  params: {
    siteId: string;
    stockItemId: string;
    type: StockMovementType;
    qtyBase: number;
    refType: string;
    refId: string;
    lineKey?: string;
    occurredAt?: Date;
    note?: string | null;
    staffUserId?: string | null;
    allowNegative?: boolean;
  },
) {
  const lineKey = params.lineKey ?? "";
  const existing = await tx.stockMovement.findFirst({
    where: {
      siteId: params.siteId,
      refType: params.refType,
      refId: params.refId,
      lineKey,
      stockItemId: params.stockItemId,
    },
  });
  if (existing) return existing;

  const item = await tx.stockItem.findFirst({
    where: { id: params.stockItemId, siteId: params.siteId, active: true },
  });
  if (!item) throw new StockError("Stok kartı bulunamadı.");

  const delta = Math.trunc(params.qtyBase);
  if (delta === 0) throw new StockError("Hareket miktarı sıfır olamaz.");

  const nextBalance = item.balanceBase + delta;
  if (!params.allowNegative && nextBalance < 0) {
    throw new StockError(
      `${item.name} için yetersiz stok (mevcut: ${formatStockBalance(item.balanceBase, item.unit as StockUnit)}).`,
    );
  }

  const movement = await tx.stockMovement.create({
    data: {
      siteId: params.siteId,
      stockItemId: item.id,
      type: params.type,
      qtyBase: delta,
      balanceAfter: nextBalance,
      refType: params.refType,
      refId: params.refId,
      lineKey,
      occurredAt: params.occurredAt ?? new Date(),
      note: params.note?.trim() || null,
      staffUserId: params.staffUserId ?? null,
    },
  });

  const updated = await tx.stockItem.update({
    where: { id: item.id },
    data: { balanceBase: nextBalance },
  });

  await syncProductStockQty(tx, updated);
  return movement;
}

export async function ensureFinishedStockItemForProduct(
  tx: Db,
  siteId: string,
  productId: string,
  variantId?: string | null,
  opts?: { initialBalance?: number },
) {
  const product = await tx.storeProduct.findFirst({
    where: { id: productId, siteId },
    select: { id: true, title: true, sku: true, stockQty: true, variants: { where: variantId ? { id: variantId } : { isDefault: true }, take: 1 } },
  });
  if (!product) throw new StockError("Ürün bulunamadı.");

  const variant = variantId ? product.variants[0] : product.variants[0] ?? null;
  const existing = await tx.stockItem.findFirst({
    where: {
      siteId,
      productId,
      variantId: variant?.id ?? null,
      kind: "finished",
    },
  });
  if (existing) return existing;

  const balance =
    opts?.initialBalance ??
    (variant?.stockQty ?? product.stockQty);
  return tx.stockItem.create({
    data: {
      siteId,
      name: variant ? `${product.title} — ${variant.label}` : product.title,
      sku: variant?.sku ?? product.sku,
      kind: "finished",
      unit: "adet",
      balanceBase: Math.max(0, balance),
      productId: product.id,
      variantId: variant?.id ?? null,
    },
  });
}

export async function convertInvoiceLineToBase(
  qty: number,
  invoiceUnit: string,
  stockUnit: StockUnit,
): Promise<number> {
  const base = invoiceQtyToBase(qty, invoiceUnit, stockUnit);
  if (base <= 0) throw new StockError("Geçersiz miktar.");
  return base;
}
