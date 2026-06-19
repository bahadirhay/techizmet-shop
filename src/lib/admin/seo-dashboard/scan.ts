import "server-only";

import {
  evaluateProductSeoHealth,
  seoHealthScore,
} from "@/lib/admin/product-seo/health";
import { auditSiteSeo } from "@/lib/admin/site-seo/optimizer";
import type { SeoDashboardProductRow, SeoDashboardScan } from "@/lib/admin/seo-dashboard/types";
import { getSeoAiConfig, seoAiAvailable } from "@/lib/admin/product-seo/ai-settings";
import { getSiteDistribution } from "@/lib/seo/distribution-settings";
import { getHomepageMode, parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

const WEAK_SCORE_THRESHOLD = 75;
const PRODUCT_LIST_LIMIT = 40;

function isWeakImageAlt(alt: string | null | undefined, productTitle: string): boolean {
  const t = alt?.trim() ?? "";
  if (!t) return true;
  if (t === productTitle.trim()) return true;
  if (t === `${productTitle.trim()} — 1` || t === `${productTitle.trim()} — 2`) return true;
  return false;
}

export async function scanSeoDashboard(siteId: string): Promise<SeoDashboardScan> {
  const [site, pages, aiConfig] = await Promise.all([
    prisma.storeSite.findUnique({ where: { id: siteId } }),
    auditSiteSeo(siteId),
    getSeoAiConfig(siteId),
  ]);
  if (!site) throw new Error("Site bulunamadı");

  const settings = parseSiteSettings(site.settingsJson);
  const homepageMode = getHomepageMode(settings);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:5555";
  const distribution = getSiteDistribution(settings);
  const ai = seoAiAvailable(aiConfig);

  const products = await prisma.storeProduct.findMany({
    where: { siteId },
    select: {
      id: true,
      slug: true,
      title: true,
      published: true,
      seoTitle: true,
      seoDescription: true,
      description: true,
      descriptionHtml: true,
      keyFeaturesHtml: true,
      howToUseHtml: true,
      brandId: true,
      categoryId: true,
      imageUrl: true,
      barcode: true,
      images: {
        where: { mediaType: "image" },
        select: { id: true, alt: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows: SeoDashboardProductRow[] = [];
  let missingMeta = 0;
  let missingImageAlts = 0;
  let weak = 0;
  let needsSeoFix = 0;
  let needsImageAlts = 0;
  let scoreSum = 0;

  for (const p of products) {
    const items = evaluateProductSeoHealth({
      title: p.title,
      slug: p.slug,
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      description: p.description ?? "",
      descriptionHtml: p.descriptionHtml ?? "",
      keyFeaturesHtml: p.keyFeaturesHtml ?? "",
      howToUseHtml: p.howToUseHtml ?? "",
      brandId: p.brandId ?? "",
      categoryId: p.categoryId ?? "",
      imageUrl: p.imageUrl ?? "",
      barcode: p.barcode ?? "",
      published: p.published,
      homepageMode,
      siteUrl,
    });
    const score = seoHealthScore(items);
    scoreSum += score;

    const weakMeta =
      !p.seoTitle?.trim() ||
      !p.seoDescription?.trim() ||
      (p.seoDescription?.trim().length ?? 0) < 70;
    if (weakMeta) missingMeta += 1;

    const imgMissing = p.images.filter((img) => isWeakImageAlt(img.alt, p.title)).length;
    if (imgMissing > 0) missingImageAlts += 1;

    const issues = items
      .filter((i) => i.status !== "ok" && i.id !== "preview" && i.id !== "mirror")
      .map((i) => i.label);

    if (score < WEAK_SCORE_THRESHOLD) weak += 1;
    if (p.published && (weakMeta || score < WEAK_SCORE_THRESHOLD)) needsSeoFix += 1;
    if (p.published && imgMissing > 0) needsImageAlts += 1;

    rows.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      score,
      issues,
      missingImageAlts: imgMissing,
      imageCount: p.images.length,
      published: p.published,
    });
  }

  const publishedCount = products.filter((p) => p.published).length;
  const sortedProducts = [...rows]
    .filter((r) => r.published)
    .sort((a, b) => a.score - b.score || b.missingImageAlts - a.missingImageAlts)
    .slice(0, PRODUCT_LIST_LIMIT);

  const pageScores = pages.pages.map((p) => p.score);
  const pageAvg = pageScores.length
    ? Math.round(pageScores.reduce((a, b) => a + b, 0) / pageScores.length)
    : 0;

  return {
    scannedAt: new Date().toISOString(),
    siteUrl,
    aiEnabled: ai.any,
    aiProviders: { gemini: ai.gemini, claude: ai.claude, openai: ai.openai },
    distribution: {
      lastFullIndexAt: distribution.lastFullIndexAt ?? null,
      lastIndexNowAt: distribution.lastIndexNowAt ?? null,
      lastSitemapPingAt: distribution.lastSitemapPingAt ?? null,
    },
    summary: {
      pages: {
        ok: pages.summary.ok,
        warn: pages.summary.warn,
        fail: pages.summary.fail,
        total: pages.summary.total,
        avgScore: pageAvg,
      },
      products: {
        total: products.length,
        published: publishedCount,
        weak,
        missingMeta,
        missingImageAlts,
        avgScore: products.length ? Math.round(scoreSum / products.length) : 0,
      },
    },
    pages,
    products: sortedProducts,
    productQueue: {
      needsSeoFix,
      needsImageAlts,
    },
  };
}
