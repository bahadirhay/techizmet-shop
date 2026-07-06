import "server-only";

import { prisma } from "@/lib/prisma";
import { formatStockBalance, type StockUnit } from "@/lib/stock/units";

export type StockLedgerRow = {
  id: string;
  occurredAt: Date;
  stockItemId: string;
  stockItemName: string;
  unit: StockUnit;
  type: string;
  qtyBase: number;
  balanceAfter: number;
  refType: string;
  refId: string;
  note: string | null;
};

export type StockSummaryRow = {
  stockItemId: string;
  name: string;
  kind: string;
  unit: StockUnit;
  openingBase: number;
  inBase: number;
  outBase: number;
  closingBase: number;
};

function parseDateRange(from?: string, to?: string): { from: Date; to: Date } {
  const now = new Date();
  const toDate = to ? new Date(`${to}T23:59:59.999`) : now;
  const fromDate = from ? new Date(`${from}T00:00:00.000`) : new Date(toDate.getTime() - 30 * 86400000);
  return { from: fromDate, to: toDate };
}

export async function loadStockLedger(
  siteId: string,
  opts?: { from?: string; to?: string; stockItemId?: string },
): Promise<{ rows: StockLedgerRow[]; from: Date; to: Date }> {
  const { from, to } = parseDateRange(opts?.from, opts?.to);

  const movements = await prisma.stockMovement.findMany({
    where: {
      siteId,
      occurredAt: { gte: from, lte: to },
      ...(opts?.stockItemId ? { stockItemId: opts.stockItemId } : {}),
    },
    include: { stockItem: { select: { name: true, unit: true } } },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  const rows: StockLedgerRow[] = movements.map((m) => ({
    id: m.id,
    occurredAt: m.occurredAt,
    stockItemId: m.stockItemId,
    stockItemName: m.stockItem.name,
    unit: m.stockItem.unit as StockUnit,
    type: m.type,
    qtyBase: m.qtyBase,
    balanceAfter: m.balanceAfter,
    refType: m.refType,
    refId: m.refId,
    note: m.note,
  }));

  return { rows, from, to };
}

export async function loadStockSummary(
  siteId: string,
  opts?: { from?: string; to?: string },
): Promise<{ rows: StockSummaryRow[]; from: Date; to: Date }> {
  const { from, to } = parseDateRange(opts?.from, opts?.to);

  const items = await prisma.stockItem.findMany({
    where: { siteId, active: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  const rows: StockSummaryRow[] = [];
  for (const item of items) {
    const before = await prisma.stockMovement.aggregate({
      where: { siteId, stockItemId: item.id, occurredAt: { lt: from } },
      _sum: { qtyBase: true },
    });
    const openingBase = before._sum.qtyBase ?? 0;

    const period = await prisma.stockMovement.groupBy({
      by: ["stockItemId"],
      where: { siteId, stockItemId: item.id, occurredAt: { gte: from, lte: to } },
      _sum: { qtyBase: true },
    });
    const net = period[0]?._sum.qtyBase ?? 0;

    const ins = await prisma.stockMovement.aggregate({
      where: {
        siteId,
        stockItemId: item.id,
        occurredAt: { gte: from, lte: to },
        qtyBase: { gt: 0 },
      },
      _sum: { qtyBase: true },
    });
    const outs = await prisma.stockMovement.aggregate({
      where: {
        siteId,
        stockItemId: item.id,
        occurredAt: { gte: from, lte: to },
        qtyBase: { lt: 0 },
      },
      _sum: { qtyBase: true },
    });

    rows.push({
      stockItemId: item.id,
      name: item.name,
      kind: item.kind,
      unit: item.unit as StockUnit,
      openingBase,
      inBase: ins._sum.qtyBase ?? 0,
      outBase: Math.abs(outs._sum.qtyBase ?? 0),
      closingBase: openingBase + net,
    });
  }

  return { rows, from, to };
}

export { formatStockBalance } from "@/lib/stock/units";
