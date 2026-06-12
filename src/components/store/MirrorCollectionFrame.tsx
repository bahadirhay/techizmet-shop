import { MirrorCollectionFrameHost } from "@/components/store/MirrorCollectionFrameHost";
import type { ShopLocale } from "@/lib/i18n/locale";
import { getCollectionFramePayload } from "@/lib/mirror-collection-frame-server";
import {
  buildCollectionMirrorSrc,
  collectionMirrorFileRel,
  resolveMirrorCollectionTemplateSlug,
} from "@/lib/mirror-html-path";
import { hasPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt";
import { getDefaultSite } from "@/lib/site";

/** Koleksiyon/kategori — kategori: sunucu HTML; tüm ürünler: iframe + JSON */
export async function MirrorCollectionFrame({
  slug,
  locale,
  title,
  categorySlug,
  page = 1,
}: {
  slug: string;
  locale: ShopLocale;
  title?: string;
  categorySlug?: string;
  page?: number;
}) {
  const templateSlug = categorySlug
    ? "all"
    : (resolveMirrorCollectionTemplateSlug(slug) ?? slug);
  const src = await buildCollectionMirrorSrc(slug, locale, templateSlug, categorySlug, page, title);
  const frameTitle = title ?? `Collection — ${slug}`;

  if (categorySlug?.trim()) {
    return (
      <MirrorCollectionFrameHost
        src={src}
        title={frameTitle}
        locale={locale}
        currentPage={page}
        productsPrebuilt
      />
    );
  }

  const site = await getDefaultSite();
  const initialPayload = await getCollectionFramePayload(
    site.id,
    slug,
    locale,
    undefined,
    page,
    title,
  );
  const allPrebuiltRel = collectionMirrorFileRel("all", locale);
  const productsPrebuiltAll =
    page === 1 &&
    slug === "all" &&
    !categorySlug?.trim() &&
    hasPrebuiltMirrorHtml(allPrebuiltRel);

  return (
    <MirrorCollectionFrameHost
      src={src}
      title={frameTitle}
      locale={locale}
      currentPage={page}
      initialPayload={initialPayload}
      productsPrebuilt={productsPrebuiltAll}
    />
  );
}
