import "server-only";

import { profitabilityOrdersBaseFilter, profitabilityOrdersWhere } from "@/lib/orders/admin-order-visibility";
import { orderSourceId, orderSourceLabelById } from "@/lib/marketplace/order-source";
import { prisma } from "@/lib/prisma";
import type { DashboardChartPoint } from "@/lib/admin/nav-badges";

export type SalesReportPeriod = 7 | 30 | 90;

export type TopProductRow = {
  title: string;
  qty: number;
  revenueMinor: number;
};

export type PaymentMethodRow = {
  method: string;
  count: number;
  revenueMinor: number;
};

export type OrderSourceRow = {
  sourceId: string;
  label: string;
  count: number;
  revenueMinor: number;
};

export type SalesReport = {
  periodDays: SalesReportPeriod;
  chart: DashboardChartPoint[];
  totals: {
    orders: number;
    revenueMinor: number;
    avgOrderMinor: number;
    newCustomers: number;
  };
  topProducts: TopProductRow[];
  paymentMethods: PaymentMethodRow[];
  orderSources: OrderSourceRow[];
  statusBreakdown: { status: string; count: number }[];
};

function periodStart(days: SalesReportPeriod): Date {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function loadSalesReport(
  siteId: string,
  periodDays: SalesReportPeriod = 30,
): Promise<SalesReport> {
  const from = periodStart(periodDays);
  const now = new Date();

  const chart: DashboardChartPoint[] = [];
  const step = periodDays <= 7 ? 1 : periodDays <= 30 ? 1 : 3;

  for (let i = periodDays - 1; i >= 0; i -= step) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    const agg = await prisma.storeOrder.aggregate({
      where: {
        siteId,
        createdAt: { gte: d, lte: end },
        ...profitabilityOrdersBaseFilter,
      },
      _sum: { totalMinor: true },
      _count: true,
    });
    chart.push({
      label:
        periodDays <= 14
          ? d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" })
          : d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
      orders: agg._count,
      revenueMinor: agg._sum.totalMinor ?? 0,
    });
  }

  const totalsAgg = await prisma.storeOrder.aggregate({
    where: profitabilityOrdersWhere(siteId, from),
    _sum: { totalMinor: true },
    _count: true,
  });

  const orders = totalsAgg._count;
  const revenueMinor = totalsAgg._sum.totalMinor ?? 0;

  const newCustomers = await prisma.storeCustomer.count({
    where: { siteId, createdAt: { gte: from } },
  });

  const lines = await prisma.storeOrderLine.findMany({
    where: {
      order: {
        siteId,
        createdAt: { gte: from },
        ...profitabilityOrdersBaseFilter,
      },
    },
    select: { title: true, qty: true, lineMinor: true },
  });

  const byProduct = new Map<string, TopProductRow>();
  for (const l of lines) {
    const key = l.title.trim() || "Ürün";
    const row = byProduct.get(key) ?? { title: key, qty: 0, revenueMinor: 0 };
    row.qty += l.qty;
    row.revenueMinor += l.lineMinor;
    byProduct.set(key, row);
  }
  const topProducts = [...byProduct.values()]
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .slice(0, 10);

  const ordersInPeriod = await prisma.storeOrder.findMany({
    where: profitabilityOrdersWhere(siteId, from),
    select: { paymentMethod: true, totalMinor: true, marketplacePlatform: true },
  });

  const byPay = new Map<string, PaymentMethodRow>();
  const bySource = new Map<string, OrderSourceRow>();
  for (const o of ordersInPeriod) {
    const method = o.paymentMethod?.trim() || "other";
    const payRow = byPay.get(method) ?? { method, count: 0, revenueMinor: 0 };
    payRow.count += 1;
    payRow.revenueMinor += o.totalMinor;
    byPay.set(method, payRow);

    const sourceId = orderSourceId(o.marketplacePlatform);
    const srcRow = bySource.get(sourceId) ?? {
      sourceId,
      label: orderSourceLabelById(sourceId),
      count: 0,
      revenueMinor: 0,
    };
    srcRow.count += 1;
    srcRow.revenueMinor += o.totalMinor;
    bySource.set(sourceId, srcRow);
  }

  const grouped = await prisma.storeOrder.groupBy({
    by: ["status"],
    where: { siteId, createdAt: { gte: from } },
    _count: { _all: true },
  });

  return {
    periodDays,
    chart,
    totals: {
      orders,
      revenueMinor,
      avgOrderMinor: orders > 0 ? Math.round(revenueMinor / orders) : 0,
      newCustomers,
    },
    topProducts,
    paymentMethods: [...byPay.values()].sort((a, b) => b.revenueMinor - a.revenueMinor),
    orderSources: [...bySource.values()].sort((a, b) => b.revenueMinor - a.revenueMinor),
    statusBreakdown: grouped.map((g) => ({ status: g.status, count: g._count._all })),
  };
}
