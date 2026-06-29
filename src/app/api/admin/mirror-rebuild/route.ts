import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireStaffApi } from "@/lib/staff-auth";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { storeMirrorTag } from "@/lib/cache/store-cache";
import { buildMirrorHtmlCore } from "@/lib/mirror-html-processor";
import { resolveMirrorProductTemplateSlug, productMirrorFileRel } from "@/lib/mirror-html-path";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";

/** Admin — Ürün mirror HTML'ini yeniden oluştur ve önbelleği sıfırla */
export async function POST(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug) {
    return NextResponse.json({ error: "slug gerekli" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const product = await prisma.storeProduct.findFirst({
    where: { slug, siteId: site.id },
    select: { id: true, published: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  const templateSlug = resolveMirrorProductTemplateSlug(slug);
  if (!templateSlug) {
    return NextResponse.json({ error: "Ürün şablonu bulunamadı" }, { status: 404 });
  }

  // Önce cache'i temizle
  revalidateTag(storeMirrorTag(site.id), { expire: 0 });
  revalidatePath(`/products/${slug}`);

  // Her iki locale için mirror HTML'ini sıfırdan oluştur (cache'i ısıt)
  const locales = ["tr", "en"] as const;
  const results: Record<string, string> = {};

  for (const locale of locales) {
    try {
      const normalized = productMirrorFileRel(templateSlug, locale);
      await buildMirrorHtmlCore({
        normalized,
        locale,
        siteId: site.id,
        siteName: site.name,
        productSlug: slug,
      });
      results[locale] = "ok";
    } catch (err) {
      results[locale] = String(err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, slug, results });
}
