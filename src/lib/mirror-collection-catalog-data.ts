import type { VitrinCollectionDetail } from "@/lib/mirror-collections-sync";
import type { CollectionCatalogPayload } from "@/lib/mirror-collection-payload-types";
import type { ShopLocale } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";
import { MIRROR_COLLECTION_PAGE_SIZE } from "@/lib/mirror-collections-sync";
import { getCategoryFilterOptions, getCategoryScopeIds } from "@/lib/store-category-tree";

/** Koleksiyon/kategori ürün listesi — prebuild ve runtime (server-only değil) */
export async function loadCollectionCatalogCore(
  siteId: string,
  slug: string,
  locale: ShopLocale,
  categorySlug?: string,
  page = 1,
  titleHint?: string,
): Promise<CollectionCatalogPayload> {
  const safePage = Math.max(1, page);
  const settings = await getSiteSettingsUncached(siteId);
  const mirrorTexts = resolveMirrorCollectionTexts(locale, settings.store?.texts);

  const [row, categories] = await Promise.all([
    categorySlug
      ? prisma.storeCategory.findFirst({
          where: { siteId, slug: categorySlug, active: true },
          select: { title: true, description: true, seoDescription: true, imageUrl: true },
        })
      : prisma.storeCollection.findUnique({
          where: { siteId_slug: { siteId, slug } },
          select: { title: true, description: true, imageUrl: true },
        }),
    prisma.storeCategory.findMany({
      where: { siteId, active: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, slug: true, title: true, parentId: true },
    }),
  ]);

  const categoryScopeIds = getCategoryScopeIds(categories, categorySlug);
  const productWhere = {
    siteId,
    published: true,
    ...(categorySlug
      ? categoryScopeIds?.length
        ? {
            OR: [
              { categoryId: { in: categoryScopeIds } },
              { categoryLinks: { some: { categoryId: { in: categoryScopeIds } } } },
            ],
          }
        : { category: { is: { slug: categorySlug, active: true } } }
      : slug === "all"
        ? {}
        : { collection: { slug } }),
  };

  const [totalProductCount, products] = await Promise.all([
    prisma.storeProduct.count({ where: productWhere }),
    prisma.storeProduct.findMany({
      where: productWhere,
      orderBy: { title: "asc" },
      skip: (safePage - 1) * MIRROR_COLLECTION_PAGE_SIZE,
      take: MIRROR_COLLECTION_PAGE_SIZE,
      select: {
        slug: true,
        title: true,
        imageUrl: true,
        priceMinor: true,
        compareAtMinor: true,
        stockQty: true,
        lowStockThreshold: true,
        badgesJson: true,
      },
    }),
  ]);

  const paginationBasePath = categorySlug
    ? `/collections/all?category=${encodeURIComponent(categorySlug)}`
    : slug === "all"
      ? "/collections/all"
      : `/collections/${encodeURIComponent(slug)}`;

  const collectionFromAdmin: VitrinCollectionDetail | null = row
    ? {
        title: row.title,
        description:
          typeof row.description === "string" && row.description.trim()
            ? row.description
            : "seoDescription" in row &&
                typeof row.seoDescription === "string" &&
                row.seoDescription.trim()
              ? row.seoDescription
              : null,
        imageUrl: "imageUrl" in row && typeof row.imageUrl === "string" ? row.imageUrl : null,
      }
    : slug === "all"
      ? { title: titleHint ?? "Tüm ürünler", description: null, imageUrl: null }
      : null;

  return {
    collectionFromAdmin,
    productsFromAdmin: products,
    totalProductCount,
    categoriesFromAdmin: getCategoryFilterOptions(categories, categorySlug).map((c) => ({
      slug: c.slug,
      title: c.title,
    })),
    activeCategorySlug: categorySlug,
    mirrorTexts,
    paginationBasePath,
    title: row?.title ?? titleHint ?? (slug === "all" ? "Tüm ürünler" : slug),
  };
}
