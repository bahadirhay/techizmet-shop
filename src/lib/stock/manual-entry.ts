import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ensureFinishedStockItemForProduct,
  recordStockMovement,
  StockError,
} from "@/lib/stock/movements";

type Db = PrismaClient | Prisma.TransactionClient;

/** Stok kartına manuel giriş/çıkış (+ veya − miktar) */
export async function applyManualStockAdjustment(
  db: Db,
  params: {
    siteId: string;
    stockItemId: string;
    qty: number;
    note?: string | null;
    staffUserId?: string | null;
    occurredAt?: Date;
  },
) {
  const item = await db.stockItem.findFirst({
    where: { id: params.stockItemId, siteId: params.siteId, active: true },
  });
  if (!item) throw new StockError("Stok kartı bulunamadı.");

  const raw = Number(params.qty);
  if (!Number.isFinite(raw) || raw === 0) throw new StockError("Miktar sıfır olamaz.");

  const deltaBase =
    item.unit === "kg" ? Math.round(raw * 1000) : Math.trunc(raw);

  return recordStockMovement(db, {
    siteId: params.siteId,
    stockItemId: item.id,
    type: "adjustment",
    qtyBase: deltaBase,
    refType: "manual",
    refId: item.id,
    lineKey: `manual-${Date.now()}`,
    occurredAt: params.occurredAt,
    note: params.note?.trim() || "Manuel stok girişi",
    staffUserId: params.staffUserId,
    allowNegative: false,
  });
}

/** Ürün admin stok alanı — mamul kartı bakiyesini hedef miktara getir */
export async function syncProductStockChangeToLedger(
  db: Db,
  params: {
    siteId: string;
    productId: string;
    variantId?: string | null;
    previousQty: number;
    newQty: number;
    note?: string | null;
    staffUserId?: string | null;
  },
) {
  const existingItem = await db.stockItem.findFirst({
    where: {
      siteId: params.siteId,
      productId: params.productId,
      variantId: params.variantId ?? null,
      kind: "finished",
    },
  });

  const item =
    existingItem ??
    (await ensureFinishedStockItemForProduct(
      db,
      params.siteId,
      params.productId,
      params.variantId,
      { initialBalance: Math.max(0, params.previousQty) },
    ));

  // Kart yeni oluşturulduysa ürün stoku zaten güncellenmiş olabilir — hedefe göre fark al
  const targetBalance = Math.max(0, params.newQty);
  const delta = targetBalance - item.balanceBase;
  if (delta === 0) {
    // Ürün sayacı ile kart uyumlu tut
    if (item.unit === "adet" && !params.variantId) {
      await db.storeProduct.update({
        where: { id: params.productId },
        data: { stockQty: targetBalance },
      });
    }
    return null;
  }

  const movement = await recordStockMovement(db, {
    siteId: params.siteId,
    stockItemId: item.id,
    type: "adjustment",
    qtyBase: delta,
    refType: "manual",
    refId: params.productId,
    lineKey: `product-${params.variantId ?? "base"}-${Date.now()}`,
    note: params.note?.trim() || "Ürün kartından manuel stok",
    staffUserId: params.staffUserId,
    allowNegative: false,
  });

  return movement;
}

/** Toplu stok +/- — hareket defterine yaz */
export async function applyProductStockDeltaToLedger(
  db: Db,
  params: {
    siteId: string;
    productId: string;
    previousQty: number;
    newQty: number;
    note?: string | null;
    staffUserId?: string | null;
  },
) {
  return syncProductStockChangeToLedger(db, {
    siteId: params.siteId,
    productId: params.productId,
    previousQty: params.previousQty,
    newQty: params.newQty,
    note: params.note,
    staffUserId: params.staffUserId,
  });
}
