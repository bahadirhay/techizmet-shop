import "server-only";

import {
  applyOrderFinanceSnapshot,
  parseOrderFinanceSnapshot,
} from "@/lib/finance/order-economics";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { syncOrdersToFinance } from "@/lib/finance/sync-orders";
import { prisma } from "@/lib/prisma";

/** Kart ödemesi onaylandığında satış geliri + snapshot + tahmini POS komisyonu */
export async function recordOrderFinanceOnPayment(siteId: string, orderId: string): Promise<void> {
  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    select: {
      id: true,
      orderNumber: true,
      paymentMethod: true,
      paymentStatus: true,
      marketplacePlatform: true,
      totalMinor: true,
      financeSnapshotJson: true,
    },
  });
  if (!order || order.paymentStatus !== "paid") return;

  await ensureFinanceDefaults(siteId);
  await syncOrdersToFinance(siteId, { orderId });
  await applyOrderFinanceSnapshot(siteId, orderId);

  if (order.marketplacePlatform || order.paymentMethod !== "card") return;

  const refreshed = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    select: { financeSnapshotJson: true },
  });
  const snapshot = parseOrderFinanceSnapshot(refreshed?.financeSnapshotJson);
  const feeMinor = snapshot?.paymentFeeMinor ?? 0;
  if (feeMinor <= 0) return;

  const existing = await prisma.financeTransaction.findFirst({
    where: {
      siteId,
      orderId,
      kind: "expense",
      reconciliationStatus: "estimated",
      description: { contains: "Tahmini kart komisyonu" },
    },
  });
  if (existing) return;

  let expenseCat = await prisma.financeCategory.findFirst({
    where: { siteId, kind: "expense", name: "Ödeme kuruluşu komisyonu" },
  });
  if (!expenseCat) {
    expenseCat = await prisma.financeCategory.create({
      data: { siteId, name: "Ödeme kuruluşu komisyonu", kind: "expense", sortOrder: 99 },
    });
  }

  const income = await prisma.financeTransaction.findFirst({
    where: { siteId, orderId, kind: "sale_income" },
  });

  await prisma.financeTransaction.create({
    data: {
      siteId,
      txDate: new Date(),
      kind: "expense",
      amountMinor: feeMinor,
      categoryId: expenseCat.id,
      orderId,
      linkedTxId: income?.id ?? null,
      description: `Tahmini kart komisyonu — ${order.orderNumber}`,
      reconciliationStatus: "estimated",
      notes: "PayTR / POS tahmini — ekstre gelince güncelleyin",
    },
  });
}
