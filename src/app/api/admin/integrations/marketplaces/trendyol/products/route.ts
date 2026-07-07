import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseProductAttributes } from "@/lib/marketplace/attribute-mapping";
import { marketplaceProductListingDb } from "@/lib/marketplace/prisma-marketplace";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const params = new URL(req.url).searchParams;
  const categoryId = params.get("categoryId")?.trim() || "";
  const search = params.get("q")?.trim().toLocaleLowerCase("tr") || "";

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
      variantOptionName: true,
      marketplaceAttributesJson: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      variants: { select: { label: true, sku: true } },
    },
  });

  // Listeleme durumları
  const statusByProduct = new Map<string, { status: string; error: string | null }>();
  const listingDb = marketplaceProductListingDb();
  if (listingDb) {
    const listings = await prisma.marketplaceProductListing.findMany({
      where: { siteId: auth.siteId, platform: "trendyol", productId: { in: products.map((p) => p.id) } },
      select: { productId: true, listingStatus: true, lastError: true },
    });
    for (const l of listings) {
      statusByProduct.set(l.productId, { status: l.listingStatus, error: l.lastError });
    }
  }

  const rows = products
    .map((p) => {
      const variantText = p.variants.map((v) => `${v.label} ${v.sku ?? ""}`).join(" ");
      const searchText = [p.title, p.sku ?? "", variantText, p.description ?? ""]
        .join(" ")
        .toLocaleLowerCase("tr");
      const listing = statusByProduct.get(p.id);
      return {
        id: p.id,
        title: p.title,
        sku: p.sku,
        barcode: p.barcode,
        imageUrl: p.imageUrl ?? p.images[0]?.url ?? null,
        categoryId: p.categoryId,
        stockQty: p.stockQty,
        variantOptionName: p.variantOptionName,
        searchText,
        overrides: parseProductAttributes(p.marketplaceAttributesJson, "trendyol"),
        listingStatus: listing?.status ?? "none",
        lastError: listing?.error ?? null,
      };
    })
    .filter((r) => (search ? r.searchText.includes(search) : true));

  return NextResponse.json({ products: rows });
}
