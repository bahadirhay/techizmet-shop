import "server-only";

import { loadSalesReport, type SalesReport } from "@/lib/admin/sales-report";
import { loadPayoutReconciliation, type PayoutReconciliationReport } from "@/lib/finance/payout-reconciliation";
import { fetchInstagramMediaInsights, type InstagramMediaInsight } from "@/lib/social-publish/meta";
import { resolveSocialPublishConfig } from "@/lib/social-publish/settings";
import { getSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export type ListingIssueRow = {
  productId: string;
  productTitle: string;
  platform: string;
  listingStatus: string;
  lastError: string | null;
};

export type ContentGapRow = {
  productId: string;
  productTitle: string;
  /** Instagram taslağı hiç yok mu, yoksa hiç yayınlanmamış mı */
  reason: "no_draft" | "never_published";
};

export type RecentInstagramPost = {
  productTitle: string;
  publishedAt: string;
  insight: InstagramMediaInsight | null;
};

export type StoreSnapshot = {
  siteId: string;
  generatedAt: string;
  sales: SalesReport;
  payouts: {
    trendyol: PayoutReconciliationReport | null;
    amazon: PayoutReconciliationReport | null;
  };
  listingIssues: ListingIssueRow[];
  pendingTrendyolQuestions: number;
  instagramContentGaps: ContentGapRow[];
  activeProductCount: number;
  /** Son 30 günde yayınlanan Instagram gönderileri + varsa erişim/etkileşim metrikleri */
  recentInstagramPosts: RecentInstagramPost[];
  instagramInsightsAvailable: boolean;
};

const PROBLEM_LISTING_STATUSES = ["rejected", "suppressed", "incomplete", "inactive", "pending"];

/** Site için Trendyol/Amazon/Instagram performans verisini tek snapshot'ta toplar. */
export async function collectStoreSnapshot(siteId: string): Promise<StoreSnapshot> {
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const [sales, trendyolPayouts, amazonPayouts, listings, pendingTrendyolQuestions, activeProducts, settings, recentPublishedInstagram] =
    await Promise.all([
      loadSalesReport(siteId, 30),
      loadPayoutReconciliation(siteId, "trendyol").catch(() => null),
      loadPayoutReconciliation(siteId, "amazon_tr").catch(() => null),
      prisma.marketplaceProductListing.findMany({
        where: {
          siteId,
          listingStatus: { in: PROBLEM_LISTING_STATUSES },
        },
        select: {
          productId: true,
          platform: true,
          listingStatus: true,
          lastError: true,
          product: { select: { title: true } },
        },
        take: 100,
      }),
      prisma.trendyolQuestion.count({
        where: { siteId, answerStatus: "needs_review" },
      }),
      prisma.storeProduct.findMany({
        where: { siteId, published: true },
        select: {
          id: true,
          title: true,
          socialContentDrafts: {
            where: { platform: "instagram" },
            select: { status: true, publishedAt: true },
            take: 1,
          },
        },
        take: 500,
      }),
      getSiteSettings(siteId),
      prisma.socialContentDraft.findMany({
        where: {
          siteId,
          platform: "instagram",
          status: "published",
          publishedAt: { gte: since30d },
        },
        select: {
          externalId: true,
          publishedAt: true,
          product: { select: { title: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: 10,
      }),
    ]);

  const metaConfig = resolveSocialPublishConfig(settings).meta;
  const instagramInsightsAvailable = metaConfig.enabled && Boolean(metaConfig.accessToken && metaConfig.instagramAccountId);
  const recentInstagramPosts: RecentInstagramPost[] = [];
  if (instagramInsightsAvailable) {
    for (const post of recentPublishedInstagram) {
      const insight = post.externalId
        ? await fetchInstagramMediaInsights(post.externalId, metaConfig).catch(() => null)
        : null;
      recentInstagramPosts.push({
        productTitle: post.product.title,
        publishedAt: post.publishedAt?.toISOString() ?? "",
        insight,
      });
    }
  }

  const listingIssues: ListingIssueRow[] = listings.map((l) => ({
    productId: l.productId,
    productTitle: l.product.title,
    platform: l.platform,
    listingStatus: l.listingStatus,
    lastError: l.lastError,
  }));

  const instagramContentGaps: ContentGapRow[] = [];
  for (const p of activeProducts) {
    const draft = p.socialContentDrafts[0];
    if (!draft) {
      instagramContentGaps.push({ productId: p.id, productTitle: p.title, reason: "no_draft" });
    } else if (!draft.publishedAt) {
      instagramContentGaps.push({ productId: p.id, productTitle: p.title, reason: "never_published" });
    }
  }

  return {
    siteId,
    generatedAt: new Date().toISOString(),
    sales,
    payouts: { trendyol: trendyolPayouts, amazon: amazonPayouts },
    listingIssues,
    pendingTrendyolQuestions,
    instagramContentGaps: instagramContentGaps.slice(0, 30),
    activeProductCount: activeProducts.length,
    recentInstagramPosts,
    instagramInsightsAvailable,
  };
}
