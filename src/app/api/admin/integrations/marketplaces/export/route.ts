import { NextResponse } from "next/server";
import { upsertProductMarketplaceListing } from "@/lib/marketplace/catalog-import";
import { buildMarketplaceProductXml } from "@/lib/marketplace/sync";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const platform = new URL(req.url).searchParams.get("platform") ?? "export";
  const site = await getDefaultSite();
  const products = await prisma.storeProduct.findMany({
    where: { siteId: auth.siteId, published: true },
    include: { brand: true, category: true },
    orderBy: { title: "asc" },
  });

  const xml = buildMarketplaceProductXml(site.name, products);

  if (platform !== "export") {
    for (const p of products.filter((item) => item.stockQty > 0)) {
      await upsertProductMarketplaceListing(auth.siteId, p.id, platform, {
        barcode: p.barcode?.trim() ?? null,
        listingStatus: "exported",
        contentSyncedAt: p.updatedAt,
      });
    }
  }

  await prisma.marketplaceSyncLog.create({
    data: {
      siteId: auth.siteId,
      platform,
      action: "export_xml",
      status: "success",
      message: `${products.length} ürün XML dışa aktarıldı`,
      itemsCount: products.length,
    },
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="urunler-${platform}.xml"`,
    },
  });
}
