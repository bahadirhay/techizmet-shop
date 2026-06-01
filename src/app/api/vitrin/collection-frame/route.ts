import { NextResponse } from "next/server";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { getCollectionFramePayload } from "@/lib/mirror-collection-frame-server";
import { getDefaultSite } from "@/lib/site";

export const revalidate = 300;

/** Koleksiyon/kategori ürün listesi — iframe statik, veri JSON (HTML üretimi yok) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim() || "all";
  const categorySlug = url.searchParams.get("category")?.trim() || undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const titleHint = url.searchParams.get("title")?.trim() || undefined;

  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();

  const payload = await getCollectionFramePayload(
    site.id,
    slug,
    locale,
    categorySlug,
    page,
    titleHint,
  );

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
