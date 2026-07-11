import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { marketplaceProductListingDb } from "@/lib/marketplace/prisma-marketplace";
import { parseAmazonConfig } from "@/lib/marketplace/amazon/client";
import { reconcileAmazonListings } from "@/lib/marketplace/amazon/reconcile";

export const maxDuration = 120;

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const params = new URL(req.url).searchParams;
  const categoryId = params.get("categoryId")?.trim() || "";
  const search = params.get("q")?.trim().toLocaleLowerCase("tr") || "";
  const syncAmazon = params.get("syncAmazon") === "1";

  if (syncAmazon && marketplaceProductListingDb()) {
    const integration = await prisma.marketplaceIntegration.findFirst({
      where: { siteId: auth.siteId, platform: "amazon_tr" },
    });
    if (integration) {
      let config: Record<string, string> = {};
      try {
        config = JSON.parse(integration.configJson ?? "{}") as Record<string, string>;
      } catch {
        config = {};
      }
      const creds = parseAmazonConfig(config);
      if (creds) {
        await reconcileAmazonListings(auth.siteId, creds, config);
      }
    }
  }

  const where: Record<string, unknown> = { siteId: auth.siteId, published: true };
  if (categoryId) {
    where.OR = [{ categoryId }, { categoryLinks: { some: { categoryId } } }];
  }

  const products = await prisma.storeProduct.findMany({
    where,
    orderBy: { title: "asc" },
    take: 500,
    select: {
      id: true,
      title: true,
      sku: true,
      barcode: true,
      imageUrl: true,
      description: true,
      categoryId: true,
      stockQty: true,
      category: { select: { title: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      variants: { select: { label: true, sku: true } },
    },
  });

  const statusByProduct = new Map<
    string,
    { status: string; error: string | null; metaJson: string | null; barcode: string | null }
  >();
  const listingDb = marketplaceProductListingDb();
  if (listingDb) {
    const listings = await prisma.marketplaceProductListing.findMany({
      where: {
        siteId: auth.siteId,
        platform: "amazon_tr",
        productId: { in: products.map((p) => p.id) },
      },
      select: { productId: true, listingStatus: true, lastError: true, metaJson: true, barcode: true },
    });
    for (const l of listings) {
      statusByProduct.set(l.productId, {
        status: l.listingStatus,
        error: l.lastError,
        metaJson: l.metaJson,
        barcode: l.barcode,
      });
    }
  }

  const rows = products
    .map((p) => {
      const variantText = p.variants.map((v) => `${v.label} ${v.sku ?? ""}`).join(" ");
      const searchText = [p.title, p.sku ?? "", variantText, p.description ?? "", p.category?.title ?? ""]
        .join(" ")
        .toLocaleLowerCase("tr");
      const listing = statusByProduct.get(p.id);
      let amazonSku: string | null = p.sku;
      let amazonAsin: string | null = listing?.barcode ?? null;
      if (listing?.metaJson) {
        try {
          const meta = JSON.parse(listing.metaJson) as { sku?: string; asin?: string };
          if (meta.sku?.trim()) amazonSku = meta.sku.trim();
          if (meta.asin?.trim()) amazonAsin = meta.asin.trim();
        } catch {
          /* metaJson bozuk */
        }
      }
      return {
        id: p.id,
        title: p.title,
        sku: p.sku,
        amazonSku,
        amazonAsin,
        barcode: p.barcode,
        imageUrl: p.imageUrl ?? p.images[0]?.url ?? null,
        categoryId: p.categoryId,
        categoryTitle: p.category?.title ?? null,
        stockQty: p.stockQty,
        searchText,
        listingStatus: listing?.status ?? "none",
        lastError: listing?.error ?? null,
      };
    })
    .filter((r) => (search ? r.searchText.includes(search) : true));

  return NextResponse.json({ products: rows });
}
