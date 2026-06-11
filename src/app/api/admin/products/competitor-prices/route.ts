import { NextResponse } from "next/server";
import { fetchMarketplaceCompetitorPrices } from "@/lib/admin/product-pricing/marketplace-competitor-prices";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const title = url.searchParams.get("title")?.trim() ?? "";
  const barcode = url.searchParams.get("barcode")?.trim() || undefined;
  const sku = url.searchParams.get("sku")?.trim() || undefined;
  const categoryId = url.searchParams.get("categoryId")?.trim() || undefined;
  const brandId = url.searchParams.get("brandId")?.trim() || undefined;

  if (!title) {
    return NextResponse.json({ error: "title gerekli" }, { status: 400 });
  }

  const [category, brand] = await Promise.all([
    categoryId
      ? prisma.storeCategory.findFirst({ where: { id: categoryId, siteId: auth.siteId }, select: { title: true } })
      : null,
    brandId
      ? prisma.storeBrand.findFirst({ where: { id: brandId, siteId: auth.siteId }, select: { name: true } })
      : null,
  ]);

  const report = await fetchMarketplaceCompetitorPrices({
    siteId: auth.siteId,
    title,
    categoryTitle: category?.title,
    brandTitle: brand?.name,
    barcode,
    sku,
  });

  return NextResponse.json({ report });
}
