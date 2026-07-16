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
  allowNegative?: boolean,
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
        allowNegative,
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
    allowNegative,
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
    /** Pazaryeri importunda yetersiz stokta sipariş yine de alınır */
    allowNegative?: boolean;
  },
) {
  for (const line of params.lines) {
    const kind = params.productKinds.get(line.productId) ?? "standard";
    await deductLineStock(
      tx,
      params.siteId,
      params.orderId,
      line,
      kind,
      params.staffUserId,
      params.allowNegative,
    );
  }
}

const CANCEL_STATUSES = new Set(["cancelled", "canceled", "refunded"]);

function restoreNote(nextStatus: string): string {
  const s = nextStatus.toLowerCase();
  if (s === "refunded") return "İade onaylandı — stok iadesi";
  return "Sipariş iptal — stok iadesi";
}

/** İptal / iade — stoku geri yaz (hareket defterinde giriş olarak görünür) */
export async function restoreOrderStockMovements(
  tx: Db,
  params: {
    siteId: string;
    orderId: string;
    staffUserId?: string | null;
    /** cancelled | refunded — not metninde kullanılır */
    reasonStatus?: string;
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

  const note = restoreNote(params.reasonStatus ?? "cancelled");
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
      note,
      staffUserId: params.staffUserId,
    });
    restored++;
  }
  return { restored };
}

export function isOrderStockRestoreStatus(status: string): boolean {
  return CANCEL_STATUSES.has(status.toLowerCase());
}

/**
 * Durum iptal/iade_edildi olduğunda stoku geri yazar.
 * refund_requested stok düşürülmüş kalır; onay (refunded) gelince iade edilir.
 */
export async function applyOrderStockRestoreOnStatusChange(
  tx: Db,
  params: {
    siteId: string;
    orderId: string;
    previousStatus: string;
    nextStatus: string;
    staffUserId?: string | null;
  },
): Promise<{ restored: number }> {
  if (!isOrderStockRestoreStatus(params.nextStatus)) return { restored: 0 };
  if (isOrderStockRestoreStatus(params.previousStatus)) {
    // Zaten iptal/iade durumundaydı — eksik iade hareketi varsa tamamla (idempotent)
    return restoreOrderStockMovements(tx, {
      siteId: params.siteId,
      orderId: params.orderId,
      staffUserId: params.staffUserId,
      reasonStatus: params.nextStatus,
    });
  }
  return restoreOrderStockMovements(tx, {
    siteId: params.siteId,
    orderId: params.orderId,
    staffUserId: params.staffUserId,
    reasonStatus: params.nextStatus,
  });
}

/** İptal/iade edilmiş ama stok iadesi yazılmamış siparişleri onar (rapor açılışında) */
export async function ensureStockRestoredForCancelledOrders(siteId: string): Promise<number> {
  const { prisma } = await import("@/lib/prisma");
  const orders = await prisma.storeOrder.findMany({
    where: {
      siteId,
      status: { in: ["cancelled", "canceled", "refunded"] },
    },
    select: { id: true, status: true },
    take: 300,
    orderBy: { updatedAt: "desc" },
  });

  let totalRestored = 0;
  const productIds = new Set<string>();

  for (const order of orders) {
    const sales = await prisma.stockMovement.count({
      where: { siteId, refType: "order", refId: order.id, type: "sale" },
    });
    if (!sales) continue;
    const returns = await prisma.stockMovement.count({
      where: { siteId, refType: "order_return", refId: order.id },
    });
    if (returns >= sales) continue;

    const result = await prisma.$transaction(async (tx) => {
      return restoreOrderStockMovements(tx, {
        siteId,
        orderId: order.id,
        reasonStatus: order.status,
      });
    });
    totalRestored += result.restored;

    if (result.restored > 0) {
      const lines = await prisma.storeOrderLine.findMany({
        where: { orderId: order.id, productId: { not: null } },
        select: { productId: true },
      });
      for (const l of lines) {
        if (l.productId) productIds.add(l.productId);
      }
    }
  }

  if (productIds.size) {
    const { syncStockToAllMarketplaces } = await import("@/lib/marketplace/stock-sync-all");
    await syncStockToAllMarketplaces(siteId, [...productIds]).catch(() => undefined);
  }

  return totalRestored;
}

export { StockError };
