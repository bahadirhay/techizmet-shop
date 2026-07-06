import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ensureFinishedStockItemForProduct,
  recordStockMovement,
  StockError,
} from "@/lib/stock/movements";
import { expandBundleStockDeductions, loadResolvedBundleComponents } from "@/lib/product-bundle";
import { PRODUCT_KIND_BUNDLE } from "@/lib/product-bundle";

type Db = PrismaClient | Prisma.TransactionClient;

type OrderLineLike = {
  id: string;
  productId: string;
  variantId: string | null;
  qty: number;
  title: string;
};

async function deductLineStock(
  tx: Db,
  siteId: string,
  orderId: string,
  line: OrderLineLike,
  productKind: string,
  staffUserId?: string | null,
) {
  if (productKind === PRODUCT_KIND_BUNDLE) {
    const components = await loadResolvedBundleComponents(tx, line.productId);
    const deductions = expandBundleStockDeductions(components, line.qty);
    for (const d of deductions) {
      const item = await ensureFinishedStockItemForProduct(tx, siteId, d.productId, d.variantId);
      await recordStockMovement(tx, {
        siteId,
        stockItemId: item.id,
        type: "sale",
        qtyBase: -d.qty,
        refType: "order",
        refId: orderId,
        lineKey: `${line.id}:c:${d.productId}:${d.variantId ?? ""}`,
        staffUserId,
      });
    }
    return;
  }

  const item = await ensureFinishedStockItemForProduct(tx, siteId, line.productId, line.variantId);
  await recordStockMovement(tx, {
    siteId,
    stockItemId: item.id,
    type: "sale",
    qtyBase: -line.qty,
    refType: "order",
    refId: orderId,
    lineKey: line.id,
    staffUserId,
  });
}

/** Sipariş oluşturulduğunda hareket defterine yaz (mevcut stockQty düşümüne ek) */
export async function recordOrderStockMovements(
  tx: Db,
  params: {
    siteId: string;
    orderId: string;
    lines: OrderLineLike[];
    productKinds: Map<string, string>;
    staffUserId?: string | null;
  },
) {
  for (const line of params.lines) {
    const kind = params.productKinds.get(line.productId) ?? "standard";
    await deductLineStock(tx, params.siteId, params.orderId, line, kind, params.staffUserId);
  }
}

const CANCEL_STATUSES = new Set(["cancelled", "canceled", "refunded"]);

/** İptal / iade — stoku geri yaz */
export async function restoreOrderStockMovements(
  tx: Db,
  params: {
    siteId: string;
    orderId: string;
    staffUserId?: string | null;
  },
) {
  const prior = await tx.stockMovement.findMany({
    where: { siteId: params.siteId, refType: "order", refId: params.orderId, type: "sale" },
  });
  if (!prior.length) return { restored: 0 };

  const returns = await tx.stockMovement.findMany({
    where: { siteId: params.siteId, refType: "order_return", refId: params.orderId },
    select: { lineKey: true, stockItemId: true },
  });
  const returned = new Set(returns.map((r) => `${r.lineKey}:${r.stockItemId}`));

  let restored = 0;
  for (const m of prior) {
    const key = `${m.lineKey}:${m.stockItemId}`;
    if (returned.has(key)) continue;
    await recordStockMovement(tx, {
      siteId: params.siteId,
      stockItemId: m.stockItemId,
      type: "return",
      qtyBase: -m.qtyBase,
      refType: "order_return",
      refId: params.orderId,
      lineKey: m.lineKey,
      note: "Sipariş iptal/iade",
      staffUserId: params.staffUserId,
    });
    restored++;
  }
  return { restored };
}

export function isOrderStockRestoreStatus(status: string): boolean {
  return CANCEL_STATUSES.has(status.toLowerCase());
}

export { StockError };
