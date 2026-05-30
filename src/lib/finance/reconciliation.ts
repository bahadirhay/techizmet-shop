import "server-only";

import { parseOrderFinanceSnapshot } from "@/lib/finance/order-economics";
import { formatTry } from "@/lib/admin/money";
import { prisma } from "@/lib/prisma";

export type ReconciliationRow = {
  orderId: string;
  orderNumber: string;
  platform: string;
  orderDate: Date;
  expectedMinor: number;
  estimatedMinor: number;
  confirmedMinor: number;
  deductionsMinor: number;
  varianceMinor: number;
  payoutsMinor: number;
  netMinor: number;
  status: "ok" | "missing_deduction" | "over_deducted" | "no_income" | "pending_confirmation";
  deductionIds: string[];
  incomeTxId: string | null;
};

export type UnmatchedDeduction = {
  id: string;
  txDate: Date;
  amountMinor: number;
  invoiceNumber: string | null;
  counterpartyName: string | null;
  description: string;
  platform: string | null;
  marketplaceRef: string | null;
};

export async function loadMarketplaceReconciliation(
  siteId: string,
  platform?: string,
): Promise<{ rows: ReconciliationRow[]; unmatched: UnmatchedDeduction[] }> {
  const orders = await prisma.storeOrder.findMany({
    where: {
      siteId,
      marketplacePlatform: platform ? platform : { not: null },
      status: { notIn: ["cancelled"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      orderNumber: true,
      marketplacePlatform: true,
      marketplaceRef: true,
      totalMinor: true,
      createdAt: true,
      financeSnapshotJson: true,
    },
  });

  const orderIds = orders.map((o) => o.id);

  const incomeTxs = orderIds.length
    ? await prisma.financeTransaction.findMany({
        where: { siteId, orderId: { in: orderIds }, kind: "sale_income" },
      })
    : [];

  const deductions = orderIds.length
    ? await prisma.financeTransaction.findMany({
        where: {
          siteId,
          kind: "marketplace_deduction",
          OR: [{ orderId: { in: orderIds } }, { linkedTxId: { in: incomeTxs.map((t) => t.id) } }],
        },
      })
    : [];

  const rows: ReconciliationRow[] = orders.map((o) => {
    const income = incomeTxs.find((t) => t.orderId === o.id);
    const orderDeductions = deductions.filter(
      (d) => d.orderId === o.id || (income && d.linkedTxId === income.id),
    );
    const estimatedMinor = orderDeductions
      .filter((d) => d.reconciliationStatus === "estimated")
      .reduce((s, d) => s + d.amountMinor, 0);
    const confirmedMinor = orderDeductions
      .filter((d) => d.reconciliationStatus !== "estimated")
      .reduce((s, d) => s + d.amountMinor, 0);
    const snap = parseOrderFinanceSnapshot(o.financeSnapshotJson);
    const snapEstimated =
      snap && o.marketplacePlatform
        ? snap.totalCommissionMinor + snap.shippingDeductionMinor
        : 0;
    const effectiveEstimated = estimatedMinor > 0 ? estimatedMinor : snapEstimated;
    const deductionsMinor = confirmedMinor > 0 ? confirmedMinor : effectiveEstimated;
    const varianceMinor = confirmedMinor > 0 ? confirmedMinor - effectiveEstimated : 0;
    const hasEstimated = estimatedMinor > 0 || snapEstimated > 0;
    const hasConfirmed = confirmedMinor > 0;
    const expectedMinor = income?.amountMinor ?? o.totalMinor;
    const netMinor = expectedMinor - deductionsMinor;

    let status: ReconciliationRow["status"] = "ok";
    if (!income) status = "no_income";
    else if (deductionsMinor === 0 && o.marketplacePlatform) status = "missing_deduction";
    else if (hasEstimated && !hasConfirmed && o.marketplacePlatform) status = "pending_confirmation";
    else if (deductionsMinor > expectedMinor) status = "over_deducted";

    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      platform: o.marketplacePlatform ?? "—",
      orderDate: o.createdAt,
      expectedMinor,
      estimatedMinor: effectiveEstimated,
      confirmedMinor,
      deductionsMinor,
      varianceMinor,
      payoutsMinor: 0,
      netMinor,
      status,
      deductionIds: orderDeductions.map((d) => d.id),
      incomeTxId: income?.id ?? null,
    };
  });

  const unmatched = await prisma.financeTransaction.findMany({
    where: {
      siteId,
      kind: "marketplace_deduction",
      reconciliationStatus: { in: ["open", "unmatched"] },
      orderId: null,
      linkedTxId: null,
      ...(platform ? { marketplacePlatform: platform } : {}),
    },
    orderBy: { txDate: "desc" },
    take: 50,
    select: {
      id: true,
      txDate: true,
      amountMinor: true,
      invoiceNumber: true,
      counterpartyName: true,
      description: true,
      marketplacePlatform: true,
      marketplaceRef: true,
    },
  });

  return {
    rows,
    unmatched: unmatched.map((u) => ({
      id: u.id,
      txDate: u.txDate,
      amountMinor: u.amountMinor,
      invoiceNumber: u.invoiceNumber,
      counterpartyName: u.counterpartyName,
      description: u.description,
      platform: u.marketplacePlatform,
      marketplaceRef: u.marketplaceRef,
    })),
  };
}

export async function linkDeductionToOrder(
  siteId: string,
  deductionId: string,
  orderId: string,
): Promise<{ ok: boolean; message: string }> {
  const deduction = await prisma.financeTransaction.findFirst({
    where: { id: deductionId, siteId, kind: "marketplace_deduction" },
  });
  if (!deduction) return { ok: false, message: "Kesinti kaydı bulunamadı" };

  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
  });
  if (!order) return { ok: false, message: "Sipariş bulunamadı" };

  const income = await prisma.financeTransaction.findFirst({
    where: { siteId, orderId, kind: "sale_income" },
  });

  await prisma.financeTransaction.update({
    where: { id: deductionId },
    data: {
      orderId,
      linkedTxId: income?.id ?? null,
      marketplacePlatform: order.marketplacePlatform,
      marketplaceRef: order.marketplaceRef,
      reconciliationStatus: "matched",
    },
  });

  if (income) {
    await prisma.financeTransaction.update({
      where: { id: income.id },
      data: { reconciliationStatus: "matched" },
    });
  }

  return {
    ok: true,
    message: `${order.orderNumber} siparişine bağlandı (${formatTry(deduction.amountMinor)})`,
  };
}
