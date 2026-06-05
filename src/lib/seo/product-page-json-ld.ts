import "server-only";

import {
  buildBreadcrumbListJsonLd,
  buildProductJsonLd,
  type BreadcrumbItem,
} from "@/lib/seo/json-ld";
import { loadPublishedProductSeo } from "@/lib/seo/product-seo";

export async function buildProductPageJsonLd(slug: string) {
  const ctx = await loadPublishedProductSeo(slug);
  if (!ctx) return null;

  const { site, product, metaTitle, metaDescription, imageUrls, priceMinor, inStock, sku } = ctx;
  const productPath = `/products/${product.slug}`;

  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Ana sayfa", path: "/" },
    { name: "Koleksiyonlar", path: "/collections" },
  ];
  if (product.collection) {
    breadcrumbs.push({
      name: product.collection.title,
      path: `/collections/${product.collection.slug}`,
    });
  }
  breadcrumbs.push({ name: product.title, path: productPath });

  return [
    buildProductJsonLd({
      name: metaTitle,
      description: metaDescription,
      sku,
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
