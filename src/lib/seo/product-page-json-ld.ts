import "server-only";

import { buildProductBreadcrumbItems } from "@/lib/seo/product-breadcrumbs";
import {
  buildBreadcrumbListJsonLd,
  buildProductJsonLd,
} from "@/lib/seo/json-ld";
import { loadPublishedProductSeo } from "@/lib/seo/product-seo";
import { getApprovedReviews, getReviewStats } from "@/lib/reviews/service";

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
  const [stats, reviews] = await Promise.all([
    getReviewStats(product.id),
    getApprovedReviews(product.id, 10),
  ]);

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
    }),
    buildBreadcrumbListJsonLd(breadcrumbs),
  ];
}
