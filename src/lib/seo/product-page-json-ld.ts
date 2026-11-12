import "server-only";

import { unstable_cache } from "next/cache";
import { STORE_PUBLIC_REVALIDATE_SEC, storeMirrorTag } from "@/lib/cache/store-cache";
import { buildProductBreadcrumbItems } from "@/lib/seo/product-breadcrumbs";
import {
  buildBreadcrumbListJsonLd,
  buildProductJsonLd,
} from "@/lib/seo/json-ld";
import { loadStoreShippingSummary, resolveShippingCostMinor } from "@/lib/seo/offer-shipping";
import { loadPublishedProductSeo } from "@/lib/seo/product-seo";
import { getApprovedReviews, getReviewStats } from "@/lib/reviews/service";
import { getSiteSettings } from "@/lib/site-settings";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { tenantStorage, type TenantContext } from "@/lib/tenant-context";

/** Mesafeli satış sözleşmesindeki cayma süresi (bkz. lib/legal/distance-sales-agreement) */
const WITHDRAWAL_DAYS = 14;

/**
 * Onaylı yorumlar — yorum onayı / silme `revalidateStorePublicCache(siteId, slug)` ile temizler.
 */
function loadProductReviewData(
  siteId: string,
  productId: string,
  slug: string,
  tenant: TenantContext,
) {
  return unstable_cache(
    // Önbellek yenilemesi istek bağlamı dışında da çalışabilir — kiracı (DB) açıkça verilir
    () =>
      tenantStorage.run(
        { slug: tenant.slug, databaseUrl: tenant.databaseUrl, publicOrigin: tenant.publicOrigin },
        async () => {
          const [stats, reviews] = await Promise.all([
            getReviewStats(productId),
            getApprovedReviews(productId, 10),
          ]);
          return { stats, reviews };
        },
      ),
    ["product-jsonld-reviews-v1", siteId, productId],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeMirrorTag(siteId), "store-products", `product:${slug}`],
    },
  )();
}

/** Bugünden bir yıl sonrası (YYYY-MM-DD) — fiyat her ziyarette yeniden doğrulanır */
function rollingPriceValidUntil(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export async function buildProductPageJsonLd(slug: string) {
  const ctx = await loadPublishedProductSeo(slug);
  if (!ctx) return null;

  const {
    site,
    product,
    metaDescription,
    imageUrls,
    priceMinor,
    inStock,
    sku,
    barcode,
    visibleTitle,
  } = ctx;
  const productPath = `/products/${product.slug}`;
  const breadcrumbs = buildProductBreadcrumbItems(product);

  // Yıldız/zengin sonuç yalnızca gerçek onaylı yorumlardan
  const tenant = await ensureStoreTenant();
  const [{ stats, reviews }, settings] = await Promise.all([
    loadProductReviewData(site.id, product.id, product.slug, tenant),
    getSiteSettings(site.id),
  ]);

  // Kargo / iade yapısal verisi yalnızca Türkiye içi TL satışta (sözleşme ve tarifeler buna göre)
  const domesticTr = site.currency === "TRY";
  const shippingCostMinor = domesticTr
    ? resolveShippingCostMinor(
        await loadStoreShippingSummary(site.id, tenant.databaseUrl, settings),
        priceMinor,
      )
    : null;

  return [
    buildProductJsonLd({
      name: visibleTitle,
      description: metaDescription,
      sku,
      gtin: barcode,
      brandName: product.brand?.name ?? null,
      imageUrls,
      priceMinor,
      currency: site.currency,
      inStock,
      productPath,
      siteName: site.name,
      aggregateRating:
        stats.count > 0 ? { ratingValue: stats.average, reviewCount: stats.count } : null,
      reviews: reviews.map((r) => ({
        author: r.authorName,
        rating: r.rating,
        body: r.body,
        title: r.title,
        datePublished: r.createdAt,
      })),
      priceValidUntil: rollingPriceValidUntil(),
      shipping:
        shippingCostMinor != null ? { costMinor: shippingCostMinor, countryCode: "TR" } : null,
      returnPolicy: domesticTr
        ? { countryCode: "TR", days: WITHDRAWAL_DAYS, customerPaysReturnShipping: true }
        : null,
    }),
    buildBreadcrumbListJsonLd(breadcrumbs),
  ];
}
