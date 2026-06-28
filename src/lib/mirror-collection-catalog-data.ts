import type { VitrinCollectionDetail } from "@/lib/mirror-collections-sync";
import type { CollectionCatalogPayload } from "@/lib/mirror-collection-payload-types";
import type { ShopLocale } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";
import { resolveCollectionFilterConfig } from "@/lib/collection-filter-settings";
import {
  buildCollectionFilterFacets,
  buildProductFilterWhere,
  emptyActiveCollectionFilters,
  filtersToSearchParams,
  type ActiveCollectionFilters,
} from "@/lib/collection-filter-facets";
import { MIRROR_COLLECTION_PAGE_SIZE } from "@/lib/mirror-collections-sync";
import { withProductDisplayTitle } from "@/lib/product-display-title";
import { imageUrlsFromProductRow, primaryImageUrlFromProductRow } from "@/lib/mirror-product-card-images";
import { getCategoryFilterOptions, getCategoryScopeIds } from "@/lib/store-category-tree";
import { getApprovedReviewCountsBySite } from "@/lib/reviews/service";

/** Koleksiyon/kategori ürün listesi — prebuild ve runtime (server-only değil) */
export async function loadCollectionCatalogCore(
  siteId: string,
  slug: string,
  locale: ShopLocale,
  categorySlug?: string,
  page = 1,
  titleHint?: string,
  activeFilters: ActiveCollectionFilters = emptyActiveCollectionFilters(),
): Promise<CollectionCatalogPayload> {
  const safePage = Math.max(1, page);
  const settings = await getSiteSettingsUncached(siteId);
  const mirrorTexts = resolveMirrorCollectionTexts(locale, settings.store?.texts);
  const filterConfig = resolveCollectionFilterConfig(locale, settings.store?.texts);

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
  const baseProductWhere = {
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

  const filterWhere = buildProductFilterWhere(activeFilters, filterConfig.enabled);
  const productWhere = filterWhere ? { AND: [baseProductWhere, filterWhere] } : baseProductWhere;

  const facetSelect = {
    priceMinor: true,
    stockQty: true,
    weightGrams: true,
    pieceCount: true,
    variantOptionName: true,
    brand: { select: { slug: true, name: true } },
    variants: { select: { label: true, stockQty: true } },
  } as const;

  const [totalProductCount, products, facetProducts, reviewStats] = await Promise.all([
    prisma.storeProduct.count({ where: productWhere }),
    prisma.storeProduct.findMany({
      where: productWhere,
      orderBy: { title: "asc" },
      skip: (safePage - 1) * MIRROR_COLLECTION_PAGE_SIZE,
      take: MIRROR_COLLECTION_PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        imageUrl: true,
        priceMinor: true,
        compareAtMinor: true,
        stockQty: true,
        lowStockThreshold: true,
        badgesJson: true,
        kind: true,
        weightGrams: true,
        pieceCount: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    prisma.storeProduct.findMany({
      where: baseProductWhere,
      select: facetSelect,
    }),
    getApprovedReviewCountsBySite(siteId),
  ]);

  const filterFacets = buildCollectionFilterFacets(facetProducts);

  const paginationParams = filtersToSearchParams(activeFilters);
  if (categorySlug) paginationParams.set("category", categorySlug);
  const paginationQuery = paginationParams.toString();
  const paginationBasePath = categorySlug
    ? `/collections/all${paginationQuery ? `?${paginationQuery}` : ""}`
    : slug === "all"
      ? `/collections/all${paginationQuery ? `?${paginationQuery}` : ""}`
      : `/collections/${encodeURIComponent(slug)}${paginationQuery ? `?${paginationQuery}` : ""}`;

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
    productsFromAdmin: products.map((p) => {
      const imageUrls = imageUrlsFromProductRow(p);
      const rv = reviewStats.get(p.id);
      const reviewCount = rv?.count ?? 0;
      const reviewAvg = reviewCount > 0 ? Math.round((rv!.sum / reviewCount) * 10) / 10 : 0;
      return withProductDisplayTitle({
        ...p,
        imageUrl: primaryImageUrlFromProductRow(p),
        imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
        reviewCount: reviewCount > 0 ? reviewCount : undefined,
        reviewAvg: reviewCount > 0 ? reviewAvg : undefined,
      });
    }),
    totalProductCount,
    categoriesFromAdmin: getCategoryFilterOptions(categories, categorySlug).map((c) => ({
      slug: c.slug,
      title: c.title,
    })),
    activeCategorySlug: categorySlug,
    mirrorTexts,
    paginationBasePath,
    title: row?.title ?? titleHint ?? (slug === "all" ? "Tüm ürünler" : slug),
    filterFacets,
    activeFilters,
    filterConfig,
  };
}
