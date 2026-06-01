import { NextResponse } from "next/server";
import { getCategoryCollectionMirrorHtml } from "@/lib/mirror-collection-html-server";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { getDefaultSite } from "@/lib/site";

export const revalidate = 300;

/** Kategori ürün listesi — prebuilt HTML + filtrelenmiş ürünler (flash yok) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const categorySlug = url.searchParams.get("category")?.trim();
  if (!categorySlug) {
    return NextResponse.json({ error: "category gerekli" }, { status: 400 });
  }

  const slug = url.searchParams.get("slug")?.trim() || "all";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const titleHint = url.searchParams.get("title")?.trim() || undefined;

  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();

  const html = await getCategoryCollectionMirrorHtml(
    site.id,
    locale,
    categorySlug,
    slug,
    page,
    titleHint,
  );

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
