import { ProductCardServer } from "@/components/store/ProductCardServer";
import { getStoreLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { resolveProductGridEmptyText } from "@/lib/store-static-texts";
import { getLoggedInCustomerPricing } from "@/lib/store/customer-pricing";
import { getDefaultSite } from "@/lib/site";
import { formatProductDisplayTitle } from "@/lib/product-display-title";
import { getCategoryScopeIds } from "@/lib/store-category-tree";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

export async function ProductGridBlock({
  limit = 8,
  collectionSlug,
  categorySlug,
}: {
  limit?: number;
  collectionSlug?: string;
  categorySlug?: string;
}) {
  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  const pricing = await getLoggedInCustomerPricing(site.id);
  const memberPricing = pricing;
  const categories = categorySlug
    ? await prisma.storeCategory.findMany({
        where: { siteId: site.id, active: true },
        select: { id: true, slug: true, title: true, parentId: true },
      })
    : [];
  const categoryScopeIds = categorySlug ? getCategoryScopeIds(categories, categorySlug) : null;

  const products = await prisma.storeProduct.findMany({
    where: {
      siteId: site.id,
      ...storefrontListedWhere,
      ...(collectionSlug ? { collection: { slug: collectionSlug } } : {}),
      ...(categorySlug
        ? categoryScopeIds?.length
          ? {
              OR: [
                { categoryId: { in: categoryScopeIds } },
                { categoryLinks: { some: { categoryId: { in: categoryScopeIds } } } },
              ],
            }
          : { category: { is: { slug: categorySlug, active: true } } }
        : {}),
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });

  if (products.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--kn-muted)]">
        {resolveProductGridEmptyText(locale, settings.store?.texts)}
      </p>
    );
  }

  return (
    <div className="kn-product-grid">
      {products.map((p) => (
        <ProductCardServer
          key={p.id}
          slug={p.slug}
          title={formatProductDisplayTitle({
            title: p.title,
            weightGrams: p.weightGrams,
            pieceCount: p.pieceCount,
          })}
          imageUrl={p.imageUrl}
          badgesJson={p.badgesJson}
          stockQty={p.stockQty}
          lowStockThreshold={p.lowStockThreshold}
          priceMinor={p.priceMinor}
          compareAtMinor={p.compareAtMinor}
          memberPricing={memberPricing}
        />
      ))}
    </div>
  );
}
