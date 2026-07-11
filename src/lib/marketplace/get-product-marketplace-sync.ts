import { prisma } from "@/lib/prisma";
import {
  buildProductMarketplaceSyncSummary,
  type ProductMarketplaceSyncSummary,
} from "@/lib/marketplace/listing-sync-state";

export async function getActiveMarketplacePlatforms(siteId: string): Promise<string[]> {
  const integrations = await prisma.marketplaceIntegration.findMany({
    where: { siteId, active: true },
    select: { platform: true },
    orderBy: { platform: "asc" },
  });
  return integrations.map((i) => i.platform);
}

export async function getMarketplaceSyncForProducts(
  siteId: string,
  products: { id: string; updatedAt: Date }[],
): Promise<Map<string, ProductMarketplaceSyncSummary>> {
  const map = new Map<string, ProductMarketplaceSyncSummary>();
  if (products.length === 0) return map;

  const activePlatforms = await getActiveMarketplacePlatforms(siteId);
  const productIds = products.map((p) => p.id);

  const listings =
    activePlatforms.length === 0
      ? []
      : await prisma.marketplaceProductListing.findMany({
          where: {
            siteId,
            productId: { in: productIds },
            platform: { in: activePlatforms },
          },
          select: {
            productId: true,
            platform: true,
            listingStatus: true,
            lastError: true,
            metaJson: true,
          },
        });

  const listingsByProduct = new Map<string, typeof listings>();
  for (const listing of listings) {
    const list = listingsByProduct.get(listing.productId) ?? [];
    list.push(listing);
    listingsByProduct.set(listing.productId, list);
  }

  for (const product of products) {
    map.set(
      product.id,
      buildProductMarketplaceSyncSummary({
        productId: product.id,
        productUpdatedAt: product.updatedAt,
        listings: listingsByProduct.get(product.id) ?? [],
        activePlatforms,
      }),
    );
  }

  return map;
}

export async function getMarketplaceSyncForProduct(
  siteId: string,
  productId: string,
): Promise<ProductMarketplaceSyncSummary | null> {
  const product = await prisma.storeProduct.findFirst({
    where: { id: productId, siteId },
    select: { id: true, updatedAt: true },
  });
  if (!product) return null;
  const map = await getMarketplaceSyncForProducts(siteId, [product]);
  return map.get(product.id) ?? null;
}
