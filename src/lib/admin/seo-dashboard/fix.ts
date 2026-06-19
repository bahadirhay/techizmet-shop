import "server-only";

import { applyProductSeoOptimization } from "@/lib/admin/seo-dashboard/apply-product";
import { applyProductImageAlts } from "@/lib/admin/seo-dashboard/image-alt-ai";
import type { SeoDashboardFixResult, SeoDashboardFixTarget } from "@/lib/admin/seo-dashboard/types";
import {
  evaluateProductSeoHealth,
  seoHealthScore,
} from "@/lib/admin/product-seo/health";
import { optimizeSiteSeo } from "@/lib/admin/site-seo/optimizer";
import { notifySearchEnginesForPath } from "@/lib/seo/notify-search-engines";
import { getHomepageMode, parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

const DEFAULT_BATCH = 5;
const WEAK_SCORE = 75;

async function productIdsNeedingSeo(siteId: string, limit: number): Promise<string[]> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { settingsJson: true } });
  const homepageMode = getHomepageMode(parseSiteSettings(site?.settingsJson ?? null));
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:5555";

  const products = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    select: {
      id: true,
      title: true,
      slug: true,
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
      published: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const scored = products
    .map((p) => ({
      id: p.id,
      score: seoHealthScore(
        evaluateProductSeoHealth({
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
        }),
      ),
    }))
    .filter((p) => p.score < WEAK_SCORE)
    .sort((a, b) => a.score - b.score);

  return scored.slice(0, limit).map((p) => p.id);
}

async function productIdsNeedingImageAlts(siteId: string, limit: number): Promise<string[]> {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    select: {
      id: true,
      title: true,
      images: { where: { mediaType: "image" }, select: { alt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const ids: string[] = [];
  for (const p of rows) {
    const weak = p.images.some((img) => {
      const t = img.alt?.trim() ?? "";
      return !t || t === p.title.trim();
    });
    if (weak && p.images.length) ids.push(p.id);
    if (ids.length >= limit) break;
  }
  return ids;
}

export async function runSeoDashboardFix(
  siteId: string,
  options: {
    target: SeoDashboardFixTarget;
    limit?: number;
  },
): Promise<SeoDashboardFixResult> {
  const limit = Math.min(20, Math.max(1, options.limit ?? DEFAULT_BATCH));
  const errors: string[] = [];
  const details: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  const runPages = options.target === "pages" || options.target === "all";
  const runProducts = options.target === "products" || options.target === "all";
  const runImageAlts = options.target === "image-alts" || options.target === "all";

  if (runPages) {
    try {
      const pageResult = await optimizeSiteSeo(siteId);
      processed += pageResult.updated;
      succeeded += pageResult.updated;
      details.push(`${pageResult.updated} vitrin sayfası meta alanı güncellendi`);
      notifySearchEnginesForPath("/");
      notifySearchEnginesForPath("/collections");
    } catch (e) {
      failed += 1;
      errors.push(e instanceof Error ? e.message : "Sayfa SEO hatası");
    }
  }

  if (runProducts) {
    const ids = await productIdsNeedingSeo(siteId, limit);
    for (const id of ids) {
      processed += 1;
      try {
        const r = await applyProductSeoOptimization(siteId, id);
        succeeded += 1;
        details.push(`${r.title}: ${r.message}`);
      } catch (e) {
        failed += 1;
        errors.push(e instanceof Error ? e.message : `Ürün ${id} SEO hatası`);
      }
    }
  }

  if (runImageAlts) {
    const ids = await productIdsNeedingImageAlts(siteId, limit);
    for (const id of ids) {
      processed += 1;
      try {
        const r = await applyProductImageAlts(siteId, id);
        succeeded += 1;
        details.push(`Görsel alt: ${r.updated} görsel (${r.provider})`);
        const product = await prisma.storeProduct.findFirst({
          where: { id, siteId },
          select: { slug: true, published: true },
        });
        if (product?.published) notifySearchEnginesForPath(`/products/${product.slug}`);
      } catch (e) {
        failed += 1;
        errors.push(e instanceof Error ? e.message : `Ürün ${id} görsel alt hatası`);
      }
    }
  }

  let remaining = 0;
  if (runProducts) {
    const left = await productIdsNeedingSeo(siteId, 500);
    remaining += left.length;
  }
  if (runImageAlts) {
    const left = await productIdsNeedingImageAlts(siteId, 500);
    remaining += left.length;
  }

  return {
    target: options.target,
    processed,
    succeeded,
    failed,
    remaining,
    errors,
    details,
  };
}
