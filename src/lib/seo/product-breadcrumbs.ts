import type { BreadcrumbItem } from "@/lib/seo/json-ld";
import { formatProductDisplayTitle } from "@/lib/product-display-title";

export type BreadcrumbCategory = {
  slug: string;
  title: string;
  parent?: { slug: string; title: string } | null;
};

type ProductBreadcrumbSource = {
  slug: string;
  title: string;
  weightGrams?: number | null;
  pieceCount?: number | null;
  collection?: { slug: string; title: string } | null;
  category?: BreadcrumbCategory | null;
  categoryLinks?: { category: BreadcrumbCategory }[];
};

/** Ana kategori (categoryId) — yoksa ilk ek kategori */
export function resolvePrimaryCategory(
  product: Pick<ProductBreadcrumbSource, "category" | "categoryLinks">,
): BreadcrumbCategory | null {
  if (product.category?.slug?.trim()) return product.category;
  const linked = product.categoryLinks?.[0]?.category;
  if (linked?.slug?.trim()) return linked;
  return null;
}

/**
 * Breadcrumb önceliği: kategori (taxonomy) → koleksiyon (vitrin/kampanya yedek).
 * Admin: Ana kategori alanı breadcrumb için kullanılır.
 */
export function buildProductBreadcrumbItems(product: ProductBreadcrumbSource): BreadcrumbItem[] {
  const productPath = `/products/${product.slug}`;
  const items: BreadcrumbItem[] = [{ name: "Ana sayfa", path: "/" }];

  const primaryCategory = resolvePrimaryCategory(product);

  if (primaryCategory) {
    items.push({ name: "Kategoriler", path: "/collections/all" });
    if (primaryCategory.parent?.slug) {
      items.push({
        name: primaryCategory.parent.title,
        path: `/collections/all?category=${encodeURIComponent(primaryCategory.parent.slug)}`,
      });
    }
    items.push({
      name: primaryCategory.title,
      path: `/collections/all?category=${encodeURIComponent(primaryCategory.slug)}`,
    });
  } else if (product.collection) {
    items.push({ name: "Koleksiyonlar", path: "/collections" });
    items.push({
      name: product.collection.title,
      path: `/collections/${product.collection.slug}`,
    });
  }

  items.push({
    name: formatProductDisplayTitle({
      title: product.title,
      weightGrams: product.weightGrams,
      pieceCount: product.pieceCount,
    }),
    path: productPath,
  });
  return items;
}

export function breadcrumbItemsToNav(
  items: BreadcrumbItem[],
): { name: string; href: string; current?: boolean }[] {
  return items.map((item, i) => ({
    name: item.name,
    href: item.path,
    current: i === items.length - 1,
  }));
}
