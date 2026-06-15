import { parseHTML } from "@/lib/linkedom-server";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  applyHomeListingProductsToDocument,
} from "@/lib/mirror-home-products-inject";
import type { VitrinCollectionProductCard } from "@/lib/mirror-collections-sync";
import { imageUrlsFromProductRow, primaryImageUrlFromProductRow } from "@/lib/mirror-product-card-images";
import { prisma } from "@/lib/prisma";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";
import { withProductDisplayTitle } from "@/lib/product-display-title";

export async function loadHomeListingProducts(siteId: string): Promise<VitrinCollectionProductCard[]> {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    orderBy: [{ title: "asc" }],
    select: {
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
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, mediaType: true } },
    },
  });
  return rows.map((p) => {
    const imageUrls = imageUrlsFromProductRow(p);
    const imageUrl = primaryImageUrlFromProductRow(p);
    return withProductDisplayTitle({
      slug: p.slug,
      title: p.title,
      imageUrl,
      imageUrls: imageUrls.length > 1 ? imageUrls : undefined,
      priceMinor: p.priceMinor,
      compareAtMinor: p.compareAtMinor,
      stockQty: p.stockQty,
      lowStockThreshold: p.lowStockThreshold,
      badgesJson: p.badgesJson,
      weightGrams: p.weightGrams,
      pieceCount: p.pieceCount,
    });
  });
}

export async function injectHomeListingProductsIntoHtml(
  html: string,
  siteId: string,
  locale: ShopLocale,
): Promise<string> {
  const products = await loadHomeListingProducts(siteId);
  if (!products.length) return html;

  const settings = await getSiteSettingsUncached(siteId);
  const texts = resolveMirrorCollectionTexts(locale, settings.store?.texts);
  const { document } = parseHTML(html);
  applyHomeListingProductsToDocument(document, products, locale, texts);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}
