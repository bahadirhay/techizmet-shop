import "server-only";

import { buildQuickSeoDefaults } from "@/lib/admin/product-seo/content-builders";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getSiteSeo } from "@/lib/site-settings";

export type ProductSeoEnsureInput = {
  title: string;
  brandId?: string | null;
  categoryId?: string | null;
  categoryIds?: string[];
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export async function resolveProductSeoFields(
  siteId: string,
  input: ProductSeoEnsureInput,
): Promise<{ seoTitle: string | null; seoDescription: string | null }> {
  const seoTitle = input.seoTitle?.trim() ?? "";
  const seoDescription = input.seoDescription?.trim() ?? "";
  if (seoTitle && seoDescription) {
    return { seoTitle, seoDescription };
  }

  const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { name: true } });
  const settings = await getSiteSettings(siteId);
  const siteName = getSiteSeo(settings, site?.name ?? "Mağaza").siteTitle;

  const categoryIds = [
    ...(input.categoryIds ?? []),
    ...(input.categoryId ? [input.categoryId] : []),
  ].filter(Boolean);

  const [categories, brand] = await Promise.all([
    categoryIds.length
      ? prisma.storeCategory.findMany({
          where: { siteId, id: { in: [...new Set(categoryIds)] } },
          select: { title: true },
        })
      : [],
    input.brandId
      ? prisma.storeBrand.findFirst({ where: { id: input.brandId, siteId }, select: { name: true } })
      : null,
  ]);

  const defaults = buildQuickSeoDefaults({
    title: input.title,
    brandTitle: brand?.name,
    siteName,
    categoryTitles: categories.map((c) => c.title),
    description: input.description ?? undefined,
  });

  return {
    seoTitle: seoTitle || defaults.seoTitle,
    seoDescription: seoDescription || defaults.seoDescription,
  };
}
