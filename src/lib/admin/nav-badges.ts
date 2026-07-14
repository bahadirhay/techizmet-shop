import { unstable_cache } from "next/cache";
import { orderInvoicePendingWhere } from "@/lib/admin/order-invoice-workflow";
import { ordersAwaitingActionFilter } from "@/lib/orders/admin-order-visibility";
import { prisma } from "@/lib/prisma";
import { safeCount } from "@/lib/admin/safe-count";

export type NavBadges = {
  ordersPending: number;
  ordersPreparing: number;
  ordersShipped: number;
  ordersRefund: number;
  ordersInvoicePending: number;
};

async function loadNavBadgesUncached(siteId: string): Promise<NavBadges> {
  const [ordersPending, ordersPreparing, ordersShipped, ordersRefund, ordersInvoicePending] =
    await Promise.all([
      safeCount("storeOrder", { where: { siteId, ...ordersAwaitingActionFilter } }),
      safeCount("storeOrder", { where: { siteId, status: "preparing" } }),
      safeCount("storeOrder", { where: { siteId, status: "shipped" } }),
      safeCount("storeOrder", {
        where: { siteId, status: { in: ["refund_requested", "cancelled"] } },
      }),
      safeCount("storeOrder", { where: { siteId, ...orderInvoicePendingWhere() } }),
    ]);
  return { ordersPending, ordersPreparing, ordersShipped, ordersRefund, ordersInvoicePending };
}

/** Admin menü rozetleri — 60 sn önbellek */
export function loadNavBadges(siteId: string): Promise<NavBadges> {
  return unstable_cache(
    () => loadNavBadgesUncached(siteId),
    ["admin-nav-badges", siteId],
    { revalidate: 60 },
  )();
}

export type DashboardChartPoint = { label: string; orders: number; revenueMinor: number };

export async function loadDashboardCharts(siteId: string): Promise<{
  last7Days: DashboardChartPoint[];
  statusBreakdown: { status: string; count: number }[];
}> {
  const days: DashboardChartPoint[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    const agg = await prisma.storeOrder.aggregate({
      where: {
        siteId,
        createdAt: { gte: d, lte: end },
        status: { notIn: ["cancelled"] },
      },
      _sum: { totalMinor: true },
      _count: true,
    });
    days.push({
      label: d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" }),
      orders: agg._count,
      revenueMinor: agg._sum.totalMinor ?? 0,
    });
  }

  const grouped = await prisma.storeOrder.groupBy({
    by: ["status"],
    where: { siteId },
    _count: { _all: true },
  });

  return {
    last7Days: days,
    statusBreakdown: grouped.map((g) => ({ status: g.status, count: g._count._all })),
  };
}
