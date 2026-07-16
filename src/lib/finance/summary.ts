import "server-only";

import { profitabilityOrdersWhere } from "@/lib/orders/admin-order-visibility";
import { signedAmountMinor } from "@/lib/finance/types";
import { loadProfitabilityKpis, type ProfitabilityKpis } from "@/lib/finance/profitability";
import { prisma } from "@/lib/prisma";

export type FinanceSummary = {
  periodDays: number;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  marketplaceReceivableMinor: number;
  unmatchedDeductions: number;
  openReconciliationOrders: number;
  profitability: ProfitabilityKpis;
  recentTransactions: {
    id: string;
    txDate: Date;
    kind: string;
    description: string;
    amountMinor: number;
  }[];
};

function periodStart(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

export async function loadFinanceSummary(siteId: string, periodDays = 30): Promise<FinanceSummary> {
  const from = periodStart(periodDays);

  const txs = await prisma.financeTransaction.findMany({
    where: { siteId, txDate: { gte: from } },
    select: { kind: true, amountMinor: true },
  });

  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const t of txs) {
    const signed = signedAmountMinor(t.kind, t.amountMinor);
    if (signed >= 0) incomeMinor += signed;
    else expenseMinor += Math.abs(signed);
  }

  const marketplaceOrders = await prisma.storeOrder.findMany({
    where: {
      ...profitabilityOrdersWhere(siteId, from),
      marketplacePlatform: { not: null },
    },
    select: { id: true, totalMinor: true },
  });

  const orderIds = marketplaceOrders.map((o) => o.id);
  const deductions = orderIds.length
    ? await prisma.financeTransaction.findMany({
        where: {
          siteId,
          kind: "marketplace_deduction",
          OR: [{ orderId: { in: orderIds } }, { linkedTxId: { not: null } }],
        },
        select: { orderId: true, linkedTxId: true, amountMinor: true },
      })
    : [];

  const payouts = orderIds.length
    ? await prisma.financeTransaction.findMany({
        where: { siteId, kind: "marketplace_payout", txDate: { gte: from } },
        select: { amountMinor: true },
      })
    : [];

  const totalMarketplaceSales = marketplaceOrders.reduce((s, o) => s + o.totalMinor, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amountMinor, 0);
  const totalPayouts = payouts.reduce((s, p) => s + p.amountMinor, 0);
  const marketplaceReceivableMinor = Math.max(0, totalMarketplaceSales - totalDeductions - totalPayouts);

  const unmatchedDeductions = await prisma.financeTransaction.count({
    where: {
      siteId,
      kind: "marketplace_deduction",
      reconciliationStatus: { in: ["open", "unmatched"] },
    },
  });

  const openReconciliationOrders = await prisma.financeTransaction.count({
    where: {
      siteId,
      kind: "sale_income",
      marketplacePlatform: { not: null },
      reconciliationStatus: "open",
    },
  });

  const recentTransactions = await prisma.financeTransaction.findMany({
    where: { siteId },
    orderBy: { txDate: "desc" },
    take: 8,
    select: { id: true, txDate: true, kind: true, description: true, amountMinor: true },
  });

  const profitability = await loadProfitabilityKpis(siteId, periodDays);

  return {
    periodDays,
    incomeMinor,
    expenseMinor,
    netMinor: incomeMinor - expenseMinor,
    marketplaceReceivableMinor,
    unmatchedDeductions,
    openReconciliationOrders,
    profitability,
    recentTransactions,
  };
}
