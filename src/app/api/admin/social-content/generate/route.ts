import { NextResponse } from "next/server";
import {
  generateSocialContentBulk,
  generateSocialContentForProduct,
} from "@/lib/admin/social-content/generate";
import { requireStaffApi } from "@/lib/staff-auth";
import { getDefaultSite } from "@/lib/site";
import { getSiteSeo, getSiteSettings } from "@/lib/site-settings";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as { productId?: string; productIds?: string[] };
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const siteName = getSiteSeo(settings, site.name).siteTitle;

  const productIds = Array.isArray(body.productIds)
    ? body.productIds.filter((id) => typeof id === "string" && id.trim())
    : body.productId?.trim()
      ? [body.productId.trim()]
      : [];

  if (!productIds.length) {
    return NextResponse.json({ error: "Ürün seçin" }, { status: 400 });
  }

  if (productIds.length === 1) {
    const result = await generateSocialContentForProduct({
      siteId: auth.siteId,
      siteName,
      productId: productIds[0]!,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Üretim başarısız" }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  const bulk = await generateSocialContentBulk({
    siteId: auth.siteId,
    siteName,
    productIds,
  });
  return NextResponse.json(bulk);
}
