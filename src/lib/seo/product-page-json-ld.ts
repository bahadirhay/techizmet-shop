import "server-only";

import { buildProductBreadcrumbItems } from "@/lib/seo/product-breadcrumbs";
import {
  buildBreadcrumbListJsonLd,
  buildProductJsonLd,
} from "@/lib/seo/json-ld";
import { loadPublishedProductSeo } from "@/lib/seo/product-seo";

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
    }),
    buildBreadcrumbListJsonLd(breadcrumbs),
  ];
}
