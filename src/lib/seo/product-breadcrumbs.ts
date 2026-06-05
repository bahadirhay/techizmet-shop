import type { BreadcrumbItem } from "@/lib/seo/json-ld";

type ProductBreadcrumbSource = {
  slug: string;
  title: string;
  collection?: { slug: string; title: string } | null;
  category?: { slug: string; title: string } | null;
};

export function buildProductBreadcrumbItems(product: ProductBreadcrumbSource): BreadcrumbItem[] {
  const productPath = `/products/${product.slug}`;
  const items: BreadcrumbItem[] = [
    { name: "Ana sayfa", path: "/" },
    { name: "Koleksiyonlar", path: "/collections" },
  ];

  if (product.collection) {
    items.push({
      name: product.collection.title,
      path: `/collections/${product.collection.slug}`,
    });
  } else if (product.category) {
    items.push({
      name: product.category.title,
      path: `/collections/all?category=${encodeURIComponent(product.category.slug)}`,
    });
  }

  items.push({ name: product.title, path: productPath });
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
