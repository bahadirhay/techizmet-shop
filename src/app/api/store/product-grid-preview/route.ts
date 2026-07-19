import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

/** Admin önizleme — ürün grid kartları */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(24, Math.max(1, Number(searchParams.get("limit") ?? 8)));
  const collectionSlug = searchParams.get("collectionSlug")?.trim() || undefined;

  const site = await getDefaultSite();
  const products = await prisma.storeProduct.findMany({
    where: {
      siteId: site.id,
      ...storefrontListedWhere,
      ...(collectionSlug ? { collection: { slug: collectionSlug } } : {}),
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      priceMinor: true,
      compareAtMinor: true,
    },
  });

  return NextResponse.json({ products });
}
