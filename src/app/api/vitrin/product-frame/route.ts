import { NextResponse } from "next/server";
import { loadExploreOverlayProducts } from "@/lib/explore-overlay-products";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { getProductPageBottomSettings } from "@/lib/product-page-bottom";
import { parseSiteSettings, resolveProductExploreLooks } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Ürün EXPLORE bölümü — ana kabuktan ayrı, hafif JSON */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "slug gerekli" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();
  const product = await prisma.storeProduct.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
    select: { exploreLooksJson: true, published: true },
  });
  if (!product?.published) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const settings = parseSiteSettings(site.settingsJson);
  const exploreLooks = await resolveProductExploreLooks(site.id, product.exploreLooksJson ?? null);
  const allSlugs = exploreLooks.flatMap((l) => l.productSlugs);
  const exploreProductsBySlug = await loadExploreOverlayProducts(site.id, allSlugs);
  const pageBottom = getProductPageBottomSettings(settings, locale);

  return NextResponse.json(
    { exploreLooks, exploreProductsBySlug, pageBottom },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
