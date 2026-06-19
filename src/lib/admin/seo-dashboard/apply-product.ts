import "server-only";

import { optimizeProductSeo } from "@/lib/admin/product-seo/optimizer";
import { notifyPublishedProduct } from "@/lib/seo/publish-notify";
import { serializeProductHighlights } from "@/lib/product-highlights";
import { prisma } from "@/lib/prisma";

export async function applyProductSeoOptimization(
  siteId: string,
  productId: string,
): Promise<{ ok: boolean; title: string; slug: string; message: string }> {
  const product = await prisma.storeProduct.findFirst({
    where: { id: productId, siteId },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      published: true,
      brandId: true,
      categoryId: true,
      weightGrams: true,
      pieceCount: true,
      categoryLinks: { select: { categoryId: true } },
    },
  });
  if (!product) throw new Error("Ürün bulunamadı");

  const categoryIds = [
    ...product.categoryLinks.map((l) => l.categoryId),
    ...(product.categoryId ? [product.categoryId] : []),
  ];

  const result = await optimizeProductSeo(siteId, {
    title: product.title,
    slug: product.slug,
    description: product.description ?? undefined,
    categoryIds: [...new Set(categoryIds)],
    brandId: product.brandId ?? undefined,
    productId: product.id,
    weightGrams: product.weightGrams ?? undefined,
    pieceCount: product.pieceCount ?? undefined,
  });

  await prisma.storeProduct.update({
    where: { id: productId },
    data: {
      seoTitle: result.seoTitle,
      seoDescription: result.seoDescription,
      description: result.suggestedDescription ?? undefined,
      descriptionHtml: result.suggestedDescriptionHtml ?? undefined,
      keyFeaturesHtml: result.suggestedKeyFeaturesHtml ?? undefined,
      howToUseHtml: result.suggestedHowToUseHtml ?? undefined,
      highlightsJson: result.suggestedHighlights?.length
        ? serializeProductHighlights(result.suggestedHighlights)
        : undefined,
    },
  });

  if (product.published) {
    notifyPublishedProduct(product.slug);
  }

  const aiMsg = result.ai?.used ? ` (${result.ai.provider})` : "";
  return {
    ok: true,
    title: product.title,
    slug: product.slug,
    message: `SEO güncellendi${aiMsg}`,
  };
}
