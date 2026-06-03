import "server-only";

import { applyOrderFinanceSnapshot } from "@/lib/finance/order-economics";
import { prisma } from "@/lib/prisma";

/** Siparişleri ön muhasebeye satış geliri olarak aktarır (yoksa oluşturur). */
export async function syncOrdersToFinance(
  siteId: string,
  options: { sinceDays?: number; orderId?: string } = {},
): Promise<{ created: number; skipped: number }> {
  const since = options.sinceDays
    ? new Date(Date.now() - options.sinceDays * 86400000)
    : undefined;

  const orders = await prisma.storeOrder.findMany({
    where: {
      siteId,
      ...(options.orderId ? { id: options.orderId } : {}),
      status: { notIn: ["cancelled"] },
      ...(since && !options.orderId ? { createdAt: { gte: since } } : {}),
      OR: [
        { marketplacePlatform: { not: null } },
        { paymentStatus: "paid" },
        { paymentMethod: "cod" },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      totalMinor: true,
      marketplacePlatform: true,
      marketplaceRef: true,
      paymentMethod: true,
      createdAt: true,
      financeSnapshotJson: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const o of orders) {
    const existing = await prisma.financeTransaction.findFirst({
      where: { siteId, orderId: o.id, kind: "sale_income" },
    });
    if (existing) {
      skipped++;
      if (!o.financeSnapshotJson) {
        try {
          await applyOrderFinanceSnapshot(siteId, o.id);
        } catch {
          /* backfill */
        }
      }
      continue;
    }

    const isMarketplace = Boolean(o.marketplacePlatform);
    const cat = await prisma.financeCategory.findFirst({
      where: {
        siteId,
        kind: "income",
        name: isMarketplace ? "Pazaryeri satış" : "Web satış",
      },
    });

    let accountId: string | undefined;
    if (isMarketplace && o.marketplacePlatform) {
      const acc = await prisma.financeAccount.findFirst({
        where: { siteId, kind: "marketplace_receivable", platform: o.marketplacePlatform },
      });
      accountId = acc?.id;
    }

    await prisma.financeTransaction.create({
      data: {
        siteId,
        txDate: o.createdAt,
        kind: "sale_income",
        amountMinor: o.totalMinor,
        categoryId: cat?.id,
        accountId,
        orderId: o.id,
        description: `Sipariş ${o.orderNumber}${isMarketplace ? ` (${o.marketplacePlatform})` : ""}`,
        marketplacePlatform: o.marketplacePlatform,
        marketplaceRef: o.marketplaceRef,
        reconciliationStatus: isMarketplace ? "open" : "none",
      },
    });
    created++;

    try {
      await applyOrderFinanceSnapshot(siteId, o.id);
    } catch {
      /* snapshot / tahmini kesinti hatası gelir kaydını geri almaz */
    }
  }

  return { created, skipped };
}
