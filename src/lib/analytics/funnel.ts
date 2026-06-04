import "server-only";

import { prisma } from "@/lib/prisma";

export type AnalyticsFunnel = {
  days: number;
  pageViews: number;
  productViews: number;
  addToCart: number;
  beginCheckout: number;
  purchases: number;
  /** Benzersiz ziyaretçi (visitorKey) */
  visitorsWithPageView: number;
  visitorsWithAddToCart: number;
  visitorsWithCheckout: number;
  visitorsWithPurchase: number;
};

const FUNNEL_TYPES = [
  "page_view",
  "product_view",
  "add_to_cart",
  "begin_checkout",
  "purchase",
] as const;

export async function loadAnalyticsFunnel(siteId: string, days = 7): Promise<AnalyticsFunnel> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [counts, visitorGroups] = await Promise.all([
    prisma.storeEvent.groupBy({
      by: ["eventType"],
      where: { siteId, createdAt: { gte: since }, eventType: { in: [...FUNNEL_TYPES] } },
      _count: { id: true },
    }),
    prisma.storeEvent.groupBy({
      by: ["eventType", "visitorKey"],
      where: { siteId, createdAt: { gte: since }, eventType: { in: [...FUNNEL_TYPES] } },
      _count: { id: true },
    }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.eventType, c._count.id]));

  const visitorsByType: Record<string, Set<string>> = {};
  for (const row of visitorGroups) {
    if (!visitorsByType[row.eventType]) visitorsByType[row.eventType] = new Set();
    visitorsByType[row.eventType].add(row.visitorKey);
  }

  return {
    days,
    pageViews: countMap.page_view ?? 0,
    productViews: countMap.product_view ?? 0,
    addToCart: countMap.add_to_cart ?? 0,
    beginCheckout: countMap.begin_checkout ?? 0,
    purchases: countMap.purchase ?? 0,
    visitorsWithPageView: visitorsByType.page_view?.size ?? 0,
    visitorsWithAddToCart: visitorsByType.add_to_cart?.size ?? 0,
    visitorsWithCheckout: visitorsByType.begin_checkout?.size ?? 0,
    visitorsWithPurchase: visitorsByType.purchase?.size ?? 0,
  };
}
