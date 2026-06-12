import "server-only";

import {
  commissionMinorFromGross,
  type ShippingModelId,
} from "@/lib/marketplace/commission-types";
import { resolveCommissionRule } from "@/lib/marketplace/commission-rules";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import {
  resolvePackagingCostMinor,
  resolveWebShippingCostMinor,
} from "@/lib/finance/economics-settings";
import {
  PRODUCT_KIND_BUNDLE,
  bundleSnapshotTotalCostMinor,
  parseComponentsSnapshotJson,
} from "@/lib/product-bundle";
import { prisma } from "@/lib/prisma";

export type OrderFinanceComponentCost = {
  title: string;
  qty: number;
  costMinor: number | null;
};

export type OrderFinanceLineSnapshot = {
  productId: string | null;
  title: string;
  qty: number;
  lineMinor: number;
  costMinor: number | null;
  lineKind?: string;
  componentCosts?: OrderFinanceComponentCost[];
  commissionPercent: number;
  commissionMinor: number;
  categoryId: string | null;
};

export type OrderFinanceSnapshot = {
  channel: string;
  grossMinor: number;
  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  lines: OrderFinanceLineSnapshot[];
  totalCommissionMinor: number;
  shippingDeductionMinor: number;
  /** Web: sizin ödediğiniz giden kargo maliyeti (müşteri ücretsiz kargo alsın bile) */
  shippingCostMinor: number;
  /** Sipariş başı paketleme / malzeme gideri */
  packagingCostMinor: number;
  shippingModel: ShippingModelId;
  totalCostMinor: number | null;
  /** Tahmini PayTR / kart komisyonu (web + kart) */
  paymentFeeMinor: number;
  paymentFeePercent: number | null;
  expectedNetProfitMinor: number | null;
  missingCostLines: number;
  computedAt: string;
};

export function parseOrderFinanceSnapshot(raw: string | null | undefined): OrderFinanceSnapshot | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as OrderFinanceSnapshot;
  } catch {
    return null;
  }
}

type OrderInput = {
  id: string;
  siteId: string;
  orderNumber: string;
  marketplacePlatform: string | null;
  paymentMethod: string | null;
  subtotalMinor: number;
  shippingMinor: number;
  discountMinor: number;
  totalMinor: number;
  lines: {
    productId: string | null;
    title: string;
    qty: number;
    lineMinor: number;
    discountMinor: number;
    lineKind?: string | null;
    componentsSnapshotJson?: string | null;
  }[];
};

export async function buildOrderFinanceSnapshot(order: OrderInput): Promise<OrderFinanceSnapshot> {
  const platform = order.marketplacePlatform;
  const isMarketplace = Boolean(platform);
  const productIds = order.lines.map((l) => l.productId).filter(Boolean) as string[];

  const products = productIds.length
    ? await prisma.storeProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, categoryId: true, costMinor: true },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  const lines: OrderFinanceLineSnapshot[] = [];
  let totalCommissionMinor = 0;
  let totalCostMinor = 0;
  let missingCostLines = 0;
  let shippingModel: ShippingModelId = "none";
  let shippingDeductionMinor = 0;
  let shippingRuleResolved = false;

  for (const line of order.lines) {
    const netLineMinor = Math.max(0, line.lineMinor - (line.discountMinor ?? 0));
    const product = line.productId ? productById.get(line.productId) : undefined;
    const categoryId = product?.categoryId ?? null;

    let commissionPercent = 0;
    if (isMarketplace && platform) {
      const rule = await resolveCommissionRule(order.siteId, platform, categoryId);
      commissionPercent = rule.commissionPercent;
      if (!shippingRuleResolved) {
        shippingModel = rule.shippingModel;
        shippingDeductionMinor =
          rule.shippingModel === "marketplace_cargo" ? rule.shippingFeeMinor : 0;
        shippingRuleResolved = true;
      }
    }

    const commissionMinor = isMarketplace
      ? commissionMinorFromGross(netLineMinor, commissionPercent)
      : 0;
    totalCommissionMinor += commissionMinor;

    const isBundle = line.lineKind === PRODUCT_KIND_BUNDLE;
    const componentSnapshot = isBundle
      ? parseComponentsSnapshotJson(line.componentsSnapshotJson)
      : [];
    const componentCosts: OrderFinanceComponentCost[] = componentSnapshot.map((c) => ({
      title: c.title,
      qty: c.qty,
      costMinor: c.costMinor ?? null,
    }));

    let lineCostMinor: number | null = null;
    if (isBundle && componentSnapshot.length) {
      const bundleCost = bundleSnapshotTotalCostMinor(componentSnapshot);
      if (bundleCost != null) {
        lineCostMinor = bundleCost;
        totalCostMinor += bundleCost;
      } else if (line.productId) {
        missingCostLines += 1;
      }
    } else {
      const unitCost = product?.costMinor ?? null;
      lineCostMinor = unitCost;
      if (unitCost != null && unitCost > 0) {
        totalCostMinor += unitCost * line.qty;
      } else if (line.productId) {
        missingCostLines += 1;
      }
    }

    lines.push({
      productId: line.productId,
      title: line.title,
      qty: line.qty,
      lineMinor: netLineMinor,
      costMinor: lineCostMinor,
      lineKind: line.lineKind ?? undefined,
      componentCosts: componentCosts.length ? componentCosts : undefined,
      commissionPercent,
      commissionMinor,
      categoryId,
    });
  }

  const grossMinor = order.totalMinor;
  const { resolvePaymentFeeForOrder } = await import("@/lib/finance/payment-fee");
  const { paymentFeeMinor, paymentFeePercent } = await resolvePaymentFeeForOrder(
    order.siteId,
    order.paymentMethod,
    platform,
    grossMinor,
  );

  let shippingCostMinor = 0;
  let packagingCostMinor = 0;
  if (!isMarketplace) {
    const { getSiteSettings } = await import("@/lib/site-settings");
    const settings = await getSiteSettings(order.siteId);
    shippingCostMinor = resolveWebShippingCostMinor(settings);
    packagingCostMinor = resolvePackagingCostMinor(settings);
  }

  const deductions =
    totalCommissionMinor +
    shippingDeductionMinor +
    paymentFeeMinor +
    shippingCostMinor +
    packagingCostMinor;
  const expectedNetProfitMinor =
    totalCostMinor > 0 ? grossMinor - deductions - totalCostMinor : null;

  return {
    channel: platform ?? "web",
    grossMinor,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    discountMinor: order.discountMinor,
    lines,
    totalCommissionMinor,
    shippingDeductionMinor,
    shippingCostMinor,
    packagingCostMinor,
    shippingModel,
    totalCostMinor: totalCostMinor > 0 ? totalCostMinor : null,
    paymentFeeMinor,
    paymentFeePercent,
    expectedNetProfitMinor,
    missingCostLines,
    computedAt: new Date().toISOString(),
  };
}

export async function applyOrderFinanceSnapshot(siteId: string, orderId: string): Promise<void> {
  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { lines: true },
  });
  if (!order) return;

  const snapshot = await buildOrderFinanceSnapshot({
    id: order.id,
    siteId: order.siteId,
    orderNumber: order.orderNumber,
    marketplacePlatform: order.marketplacePlatform,
    paymentMethod: order.paymentMethod,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    discountMinor: order.discountMinor,
    totalMinor: order.totalMinor,
    lines: order.lines.map((l) => ({
      productId: l.productId,
      title: l.title,
      qty: l.qty,
      lineMinor: l.lineMinor,
      discountMinor: l.discountMinor,
      lineKind: l.lineKind,
      componentsSnapshotJson: l.componentsSnapshotJson,
    })),
  });

  await prisma.storeOrder.update({
    where: { id: orderId },
    data: { financeSnapshotJson: JSON.stringify(snapshot) },
  });

  if (!order.marketplacePlatform) return;

  await ensureFinanceDefaults(siteId);
  await ensureEstimatedMarketplaceDeductions(
    siteId,
    orderId,
    order.orderNumber,
    order.marketplacePlatform,
    snapshot,
  );
}

async function ensureEstimatedMarketplaceDeductions(
  siteId: string,
  orderId: string,
  orderNumber: string,
  platform: string,
  snapshot: OrderFinanceSnapshot,
): Promise<void> {
  const income = await prisma.financeTransaction.findFirst({
    where: { siteId, orderId, kind: "sale_income" },
  });

  const expenseCat = await prisma.financeCategory.findFirst({
    where: { siteId, kind: "expense", name: "Pazaryeri komisyon / indirim faturası" },
  });

  const existingEstimated = await prisma.financeTransaction.findMany({
    where: {
      siteId,
      orderId,
      kind: "marketplace_deduction",
      reconciliationStatus: "estimated",
    },
  });

  if (existingEstimated.length > 0) return;

  const toCreate: { amountMinor: number; description: string }[] = [];

  if (snapshot.totalCommissionMinor > 0) {
    toCreate.push({
      amountMinor: snapshot.totalCommissionMinor,
      description: `Tahmini komisyon — ${orderNumber} (${platform})`,
    });
  }
  if (snapshot.shippingDeductionMinor > 0) {
    toCreate.push({
      amountMinor: snapshot.shippingDeductionMinor,
      description: `Tahmini kargo kesintisi — ${orderNumber} (${platform})`,
    });
  }

  for (const item of toCreate) {
    await prisma.financeTransaction.create({
      data: {
        siteId,
        txDate: new Date(),
        kind: "marketplace_deduction",
        amountMinor: item.amountMinor,
        categoryId: expenseCat?.id,
        orderId,
        linkedTxId: income?.id ?? null,
        description: item.description,
        marketplacePlatform: platform,
        reconciliationStatus: "estimated",
        notes: "Otomatik tahmin — kesinti faturası gelince güncelleyin",
      },
    });
  }

  if (income && toCreate.length > 0) {
    await prisma.financeTransaction.update({
      where: { id: income.id },
      data: { reconciliationStatus: "open" },
    });
  }
}
