import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

/** Local studio (anatolian-paw-ai) — yayın ürün listesi. Authorization: Bearer CRON_SECRET */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const site = await getDefaultSite();
  const products = await prisma.storeProduct.findMany({
    where: { siteId: site.id, ...storefrontListedWhere },
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      priceMinor: true,
      compareAtMinor: true,
      imageUrl: true,
      category: { select: { title: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 3, select: { url: true } },
    },
    take: 500,
  });

  return NextResponse.json({
    siteId: site.id,
    siteName: site.name,
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: (p.description ?? "").slice(0, 600),
      priceLabel: `${(p.priceMinor / 100).toFixed(2)} TL`,
      compareAtLabel: p.compareAtMinor ? `${(p.compareAtMinor / 100).toFixed(2)} TL` : null,
      imageUrl: p.imageUrl ?? p.images[0]?.url ?? null,
      imageUrls: [...new Set([p.imageUrl, ...p.images.map((i) => i.url)].filter(Boolean))],
      categoryTitle: p.category?.title ?? null,
    })),
  });
}
