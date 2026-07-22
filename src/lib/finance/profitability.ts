import "server-only";

import { parseOrderFinanceSnapshot, alignSnapshotToOrder } from "@/lib/finance/order-economics";
import {
  lineProductCostMinor,
  lineWebOperatingCostMinor,
  marketplaceDeductionsFromSnapshot,
  orderTotalCostMinor,
} from "@/lib/finance/economics-math";
import { MARKETPLACE_PLATFORMS } from "@/lib/admin/marketplace-platforms";
import { profitabilityOrdersWhere } from "@/lib/orders/admin-order-visibility";
import { prisma } from "@/lib/prisma";

export type ChannelProfitRow = {
  channel: string;
  label: string;
  orderCount: number;
  grossMinor: number;
  estimatedDeductionsMinor: number;
  confirmedDeductionsMinor: number;
  costMinor: number;
  netProfitMinor: number | null;
  marginPercent: number | null;
};

export type EstimateVsActualRow = {
  orderId: string;
  orderNumber: string;
  platform: string;
  orderDate: Date;
  estimatedMinor: number;
  confirmedMinor: number;
  varianceMinor: number;
  status: "pending" | "ok" | "variance";
};

export type PlatformPayoutRow = {
  platform: string;
  label: string;
  grossSalesMinor: number;
  confirmedDeductionsMinor: number;
  estimatedDeductionsMinor: number;
  payoutsMinor: number;
  pendingReceivableMinor: number;
};

export type ProductProfitRow = {
  productId: string | null;
  title: string;
  qtySold: number;
  grossMinor: number;
  deductionsMinor: number;
  /** Ürün maliyeti (birim × adet) */
  productCostMinor: number;
  /** Paket, kart, kargo payı */
  operatingCostMinor: number;
  costMinor: number;
  netProfitMinor: number | null;
  marginPercent: number | null;
};

export type CategoryProfitRow = {
  categoryId: string | null;
  label: string;
  orderCount: number;
  qtySold: number;
  grossMinor: number;
  deductionsMinor: number;
  productCostMinor: number;
  operatingCostMinor: number;
  costMinor: number;
  netProfitMinor: number | null;
  marginPercent: number | null;
};

export type ProfitabilityKpis = {
  grossMinor: number;
  estimatedNetProfitMinor: number | null;
  actualNetProfitMinor: number | null;
  pendingReceivableMinor: number;
  varianceOrders: number;
};

/** Dönem içi sipariş satırı — liste / kârlılık tablosu. */
export type OrderProfitRow = {
  orderId: string;
  orderNumber: string;
  channel: string;
  label: string;
  orderDate: Date;
  grossMinor: number;
  deductionsMinor: number;
  costMinor: number;
  netProfitMinor: number | null;
  marginPercent: number | null;
  hasConfirmedDeductions: boolean;
};

export type ProfitabilityReport = {
  periodDays: number;
  channels: ChannelProfitRow[];
  categories: CategoryProfitRow[];
  topProducts: ProductProfitRow[];
  ordersByProfit: OrderProfitRow[];
  estimateVsActual: EstimateVsActualRow[];
  payouts: PlatformPayoutRow[];
  totals: ProfitabilityKpis;
};

function periodStart(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

function channelLabel(channel: string): string {
  if (channel === "web") return "Web sitesi";
  const mp = MARKETPLACE_PLATFORMS.find((p) => p.id === channel);
  return mp?.label ?? channel;
}

function resolveOrderSnapshot(order: {
  totalMinor: number;
  subtotalMinor: number;
  financeSnapshotJson: string | null;
}): ReturnType<typeof parseOrderFinanceSnapshot> {
  const raw = parseOrderFinanceSnapshot(order.financeSnapshotJson);
  if (!raw) return null;
  return alignSnapshotToOrder(
    { totalMinor: order.totalMinor, subtotalMinor: order.subtotalMinor },
    raw,
  );
}

export async function loadProfitabilityReport(
  siteId: string,
  periodDays = 30,
): Promise<ProfitabilityReport> {
  const from = periodStart(periodDays);

  const orders = await prisma.storeOrder.findMany({
    where: profitabilityOrdersWhere(siteId, from),
    select: {
      id: true,
      orderNumber: true,
      marketplacePlatform: true,
      totalMinor: true,
      subtotalMinor: true,
      createdAt: true,
      financeSnapshotJson: true,
    },
  });

  const orderIds = orders.map((o) => o.id);
  const deductions = orderIds.length
    ? await prisma.financeTransaction.findMany({
        where: {
          siteId,
          kind: "marketplace_deduction",
          orderId: { in: orderIds },
        },
        select: {
          orderId: true,
          amountMinor: true,
          reconciliationStatus: true,
        },
      })
    : [];

  const payouts = await prisma.financeTransaction.findMany({
    where: {
      siteId,
      kind: "marketplace_payout",
      txDate: { gte: from },
    },
    select: { amountMinor: true, marketplacePlatform: true },
  });

  const channelMap = new Map<string, ChannelProfitRow>();

  for (const order of orders) {
    const channel = order.marketplacePlatform ?? "web";
    const snap = resolveOrderSnapshot(order);
    const gross = snap?.grossMinor ?? order.totalMinor;
    const isMarketplace = Boolean(order.marketplacePlatform);
    const estDed = snap
      ? isMarketplace
        ? marketplaceDeductionsFromSnapshot(snap)
        : 0
      : 0;
    const cost = snap ? orderTotalCostMinor(snap, isMarketplace) : 0;

    const row = channelMap.get(channel) ?? {
      channel,
      label: channelLabel(channel),
      orderCount: 0,
      grossMinor: 0,
      estimatedDeductionsMinor: 0,
      confirmedDeductionsMinor: 0,
      costMinor: 0,
      netProfitMinor: null,
      marginPercent: null,
    };

    row.orderCount += 1;
    row.grossMinor += gross;
    row.estimatedDeductionsMinor += estDed;
    row.costMinor += cost;
    channelMap.set(channel, row);
  }

  for (const d of deductions) {
    if (!d.orderId) continue;
    const order = orders.find((o) => o.id === d.orderId);
    if (!order) continue;
    const channel = order.marketplacePlatform ?? "web";
    const row = channelMap.get(channel);
    if (!row) continue;
    if (d.reconciliationStatus === "estimated") continue;
    row.confirmedDeductionsMinor += d.amountMinor;
  }

  for (const row of channelMap.values()) {
    const deductionsForNet =
      row.confirmedDeductionsMinor > 0 ? row.confirmedDeductionsMinor : row.estimatedDeductionsMinor;
    if (row.costMinor > 0 || deductionsForNet > 0) {
      row.netProfitMinor = row.grossMinor - deductionsForNet - row.costMinor;
      row.marginPercent =
        row.grossMinor > 0 ? Math.round((row.netProfitMinor / row.grossMinor) * 1000) / 10 : null;
    }
  }

  const estimateVsActual: EstimateVsActualRow[] = [];

  for (const order of orders.filter((o) => o.marketplacePlatform)) {
    const snap = resolveOrderSnapshot(order);
    const estimatedMinor = snap
      ? snap.totalCommissionMinor +
        snap.shippingDeductionMinor +
        (snap.marketplaceFixedFeeMinor ?? 0)
      : 0;
    const orderDeductions = deductions.filter((d) => d.orderId === order.id);
    const confirmedMinor = orderDeductions
      .filter((d) => d.reconciliationStatus !== "estimated")
      .reduce((s, d) => s + d.amountMinor, 0);

    if (estimatedMinor === 0 && confirmedMinor === 0) continue;

    const varianceMinor = confirmedMinor - estimatedMinor;
    let status: EstimateVsActualRow["status"] = "pending";
    if (confirmedMinor > 0) {
      status = Math.abs(varianceMinor) > 100 ? "variance" : "ok";
    }

    estimateVsActual.push({
      orderId: order.id,
      orderNumber: order.orderNumber,
      platform: order.marketplacePlatform!,
      orderDate: order.createdAt,
      estimatedMinor,
      confirmedMinor,
      varianceMinor,
      status,
    });
  }

  estimateVsActual.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());

  const confirmedDedByOrder = new Map<string, number>();
  for (const d of deductions) {
    if (!d.orderId || d.reconciliationStatus === "estimated") continue;
    confirmedDedByOrder.set(d.orderId, (confirmedDedByOrder.get(d.orderId) ?? 0) + d.amountMinor);
  }

  const ordersByProfit: OrderProfitRow[] = orders
    .map((order) => {
      const channel = order.marketplacePlatform ?? "web";
      const snap = resolveOrderSnapshot(order);
      const isMarketplace = Boolean(order.marketplacePlatform);
      const gross = snap?.grossMinor ?? order.totalMinor;
      const estimatedDed =
        snap && isMarketplace ? marketplaceDeductionsFromSnapshot(snap) : 0;
      const confirmedDed = confirmedDedByOrder.get(order.id) ?? 0;
      const hasConfirmedDeductions = confirmedDed > 0;
      const deductionsMinor = hasConfirmedDeductions ? confirmedDed : estimatedDed;
      const cost = snap ? orderTotalCostMinor(snap, isMarketplace) : 0;
      let netProfitMinor: number | null = null;
      let marginPercent: number | null = null;
      if (cost > 0 || deductionsMinor > 0) {
        netProfitMinor = gross - deductionsMinor - cost;
        marginPercent =
          gross > 0 ? Math.round((netProfitMinor / gross) * 1000) / 10 : null;
      }
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        channel,
        label: channelLabel(channel),
        orderDate: order.createdAt,
        grossMinor: gross,
        deductionsMinor,
        costMinor: cost,
        netProfitMinor,
        marginPercent,
        hasConfirmedDeductions,
      };
    })
    .sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())
    .slice(0, 200);

  const platformIds = [
    ...new Set(orders.map((o) => o.marketplacePlatform).filter(Boolean) as string[]),
  ];
  const payoutRows: PlatformPayoutRow[] = platformIds.map((platform) => {
    const platformOrders = orders.filter((o) => o.marketplacePlatform === platform);
    const grossSalesMinor = platformOrders.reduce((s, o) => {
      const snap = resolveOrderSnapshot(o);
      return s + (snap?.grossMinor ?? o.totalMinor);
    }, 0);
    const platformDeductions = deductions.filter((d) => {
      const o = orders.find((x) => x.id === d.orderId);
      return o?.marketplacePlatform === platform;
    });
    const confirmedDeductionsMinor = platformDeductions
      .filter((d) => d.reconciliationStatus !== "estimated")
      .reduce((s, d) => s + d.amountMinor, 0);
    const estimatedDeductionsMinor = platformDeductions
      .filter((d) => d.reconciliationStatus === "estimated")
      .reduce((s, d) => s + d.amountMinor, 0);
    const payoutsMinor = payouts
      .filter((p) => p.marketplacePlatform === platform)
      .reduce((s, p) => s + p.amountMinor, 0);
    const effectiveDeductions =
      confirmedDeductionsMinor > 0 ? confirmedDeductionsMinor : estimatedDeductionsMinor;

    return {
      platform,
      label: channelLabel(platform),
      grossSalesMinor,
      confirmedDeductionsMinor,
      estimatedDeductionsMinor,
      payoutsMinor,
      pendingReceivableMinor: Math.max(0, grossSalesMinor - effectiveDeductions - payoutsMinor),
    };
  });

  const productMap = new Map<string, ProductProfitRow>();
  const categoryMap = new Map<string, CategoryProfitRow>();
  const categoryIds = new Set<string>();
  let estimatedNetSum = 0;
  let actualNetSum = 0;
  let hasEstimatedNet = false;
  let hasActualNet = false;

  for (const order of orders) {
    const snap = resolveOrderSnapshot(order);
    if (!snap?.lines.length) continue;

    const isMarketplace = Boolean(order.marketplacePlatform);
    const orderDeductions = deductions.filter((d) => d.orderId === order.id);
    const confirmedOrderDed = orderDeductions
      .filter((d) => d.reconciliationStatus !== "estimated")
      .reduce((s, d) => s + d.amountMinor, 0);
    const estimatedOrderDed = isMarketplace ? marketplaceDeductionsFromSnapshot(snap) : 0;
    const effectiveDed = confirmedOrderDed > 0 ? confirmedOrderDed : estimatedOrderDed;
    const gross = snap.grossMinor;
    const cost = orderTotalCostMinor(snap, isMarketplace);

    if (cost > 0 || effectiveDed > 0) {
      const estNet = snap.expectedNetProfitMinor ?? gross - estimatedOrderDed - cost;
      estimatedNetSum += estNet;
      hasEstimatedNet = true;
      const actNet = gross - effectiveDed - cost;
      actualNetSum += actNet;
      hasActualNet = true;
    }

    for (const line of snap.lines) {
      const share = gross > 0 ? line.lineMinor / gross : 0;
      const lineDed = isMarketplace ? Math.round(effectiveDed * share) : 0;
      const lineProductCost = lineProductCostMinor(line);
      const lineOperatingCost = isMarketplace ? 0 : lineWebOperatingCostMinor(snap, line);
      const lineCost = lineProductCost + lineOperatingCost;
      const productKey = line.productId ?? `title:${line.title}`;

      const pRow = productMap.get(productKey) ?? {
        productId: line.productId,
        title: line.title,
        qtySold: 0,
        grossMinor: 0,
        deductionsMinor: 0,
        productCostMinor: 0,
        operatingCostMinor: 0,
        costMinor: 0,
        netProfitMinor: null,
        marginPercent: null,
      };
      pRow.qtySold += line.qty;
      pRow.grossMinor += line.lineMinor;
      pRow.deductionsMinor += lineDed;
      pRow.productCostMinor += lineProductCost;
      pRow.operatingCostMinor += lineOperatingCost;
      pRow.costMinor += lineCost;
      productMap.set(productKey, pRow);

      const catKey = line.categoryId ?? "__none__";
      if (line.categoryId) categoryIds.add(line.categoryId);
      const cRow = categoryMap.get(catKey) ?? {
        categoryId: line.categoryId,
        label: line.categoryId ? "" : "Kategorisiz",
        orderCount: 0,
        qtySold: 0,
        grossMinor: 0,
        deductionsMinor: 0,
        productCostMinor: 0,
        operatingCostMinor: 0,
        costMinor: 0,
        netProfitMinor: null,
        marginPercent: null,
      };
      cRow.qtySold += line.qty;
      cRow.grossMinor += line.lineMinor;
      cRow.deductionsMinor += lineDed;
      cRow.productCostMinor += lineProductCost;
      cRow.operatingCostMinor += lineOperatingCost;
      cRow.costMinor += lineCost;
      categoryMap.set(catKey, cRow);
    }
  }

  const orderCategoryKeys = new Map<string, Set<string>>();
  for (const order of orders) {
    const snap = resolveOrderSnapshot(order);
    if (!snap) continue;
    for (const line of snap.lines) {
      const catKey = line.categoryId ?? "__none__";
      const set = orderCategoryKeys.get(catKey) ?? new Set<string>();
      set.add(order.id);
      orderCategoryKeys.set(catKey, set);
    }
  }
  for (const [catKey, row] of categoryMap) {
    row.orderCount = orderCategoryKeys.get(catKey)?.size ?? 0;
  }

  if (categoryIds.size > 0) {
    const cats = await prisma.storeCategory.findMany({
      where: { siteId, id: { in: [...categoryIds] } },
      select: { id: true, title: true },
    });
    const catTitle = new Map(cats.map((c) => [c.id, c.title]));
    for (const row of categoryMap.values()) {
      if (row.categoryId) row.label = catTitle.get(row.categoryId) ?? row.categoryId;
    }
  }

  for (const row of [...productMap.values(), ...categoryMap.values()]) {
    const hasEconomics = row.costMinor > 0 || row.deductionsMinor > 0;
    if (hasEconomics) {
      row.netProfitMinor = row.grossMinor - row.deductionsMinor - row.costMinor;
      row.marginPercent =
        row.grossMinor > 0 ? Math.round((row.netProfitMinor / row.grossMinor) * 1000) / 10 : null;
    }
  }

  const channels = [...channelMap.values()].sort((a, b) => b.grossMinor - a.grossMinor);
  const totalGross = channels.reduce((s, c) => s + c.grossMinor, 0);
  const totalNet = channels.every((c) => c.netProfitMinor != null)
    ? channels.reduce((s, c) => s + (c.netProfitMinor ?? 0), 0)
    : null;

  const categories = [...categoryMap.values()]
    .filter((c) => c.grossMinor > 0)
    .sort((a, b) => b.grossMinor - a.grossMinor);
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.grossMinor - a.grossMinor)
    .slice(0, 15);

  const totals: ProfitabilityKpis = {
    grossMinor: totalGross,
    estimatedNetProfitMinor: hasEstimatedNet ? estimatedNetSum : totalNet,
    actualNetProfitMinor: hasActualNet ? actualNetSum : null,
    pendingReceivableMinor: payoutRows.reduce((s, p) => s + p.pendingReceivableMinor, 0),
    varianceOrders: estimateVsActual.filter((r) => r.status === "variance").length,
  };

  return {
    periodDays,
    channels,
    categories,
    topProducts,
    ordersByProfit,
    estimateVsActual: estimateVsActual.slice(0, 50),
    payouts: payoutRows,
    totals,
  };
}

export async function loadProfitabilityKpis(
  siteId: string,
  periodDays = 30,
): Promise<ProfitabilityKpis> {
  const report = await loadProfitabilityReport(siteId, periodDays);
  return report.totals;
}
