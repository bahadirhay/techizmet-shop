import "server-only";

import { imageUrlsFromProductRow, primaryImageUrlFromProductRow } from "@/lib/mirror-product-card-images";
import type { VitrinCollectionProductCard } from "@/lib/mirror-collections-sync";
import { prisma } from "@/lib/prisma";
import {
  parseRelatedProductsJson,
  type RelatedProductsSettings,
} from "@/lib/product-related";
import { withProductDisplayTitle } from "@/lib/product-display-title";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

const productCardSelect = {
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
  catalogSortOrder: true,
  sortOrder: true,
  images: { orderBy: { sortOrder: "asc" as const }, select: { url: true, mediaType: true } },
} as const;

function toCard(
  p: {
    slug: string;
    title: string;
    imageUrl: string | null;
    priceMinor: number;
    compareAtMinor: number | null;
    stockQty: number;
    lowStockThreshold: number;
    badgesJson: string | null;
    kind: string;
    weightGrams: number | null;
    pieceCount: number | null;
    images: { url: string; mediaType: string | null }[];
  },
): VitrinCollectionProductCard {
  const imageUrls = imageUrlsFromProductRow(p);
  return withProductDisplayTitle({
    slug: p.slug,
    title: p.title,
    imageUrl: primaryImageUrlFromProductRow(p),
    imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
    priceMinor: p.priceMinor,
    compareAtMinor: p.compareAtMinor,
    stockQty: p.stockQty,
    lowStockThreshold: p.lowStockThreshold,
    badgesJson: p.badgesJson,
    kind: p.kind,
    weightGrams: p.weightGrams,
    pieceCount: p.pieceCount,
  });
}

function applyCount(
  items: VitrinCollectionProductCard[],
  count: number | null,
): VitrinCollectionProductCard[] {
  if (count == null || count <= 0) return items;
  return items.slice(0, count);
}

/** Mevcut ürün hariç önerilen kartları yükle */
export async function loadRelatedProductCards(
  siteId: string,
  currentSlug: string,
  settingsRaw: string | null | undefined,
): Promise<{ settings: RelatedProductsSettings; products: VitrinCollectionProductCard[] }> {
  const settings = parseRelatedProductsJson(settingsRaw);
  if (settings.mode === "off") {
    return { settings, products: [] };
  }

  if (settings.mode === "manual") {
    const slugs = settings.productSlugs.filter((s) => s && s !== currentSlug);
    if (!slugs.length) return { settings, products: [] };
    const rows = await prisma.storeProduct.findMany({
      where: { siteId, slug: { in: slugs }, ...storefrontListedWhere },
      select: productCardSelect,
    });
    const bySlug = new Map(rows.map((r) => [r.slug, toCard(r)]));
    const ordered = slugs.map((s) => bySlug.get(s)).filter(Boolean) as VitrinCollectionProductCard[];
    return { settings, products: applyCount(ordered, settings.count) };
  }

  // auto — diğer tüm vitrin ürünleri
  const rows = await prisma.storeProduct.findMany({
    where: {
      siteId,
      ...storefrontListedWhere,
      NOT: { slug: currentSlug },
    },
    orderBy: [{ catalogSortOrder: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    select: productCardSelect,
  });
  return { settings, products: applyCount(rows.map(toCard), settings.count) };
}
