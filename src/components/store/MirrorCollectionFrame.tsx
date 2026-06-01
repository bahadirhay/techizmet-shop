import { MirrorCollectionFrameHost } from "@/components/store/MirrorCollectionFrameHost";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  buildCollectionMirrorSrc,
  resolveMirrorCollectionTemplateSlug,
} from "@/lib/mirror-html-path";

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
  const src = buildCollectionMirrorSrc(slug, locale, templateSlug, categorySlug, page, title);
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

  const q = new URLSearchParams({ slug, page: String(page) });
  if (title) q.set("title", title);

  return (
    <MirrorCollectionFrameHost
      src={src}
      title={frameTitle}
      locale={locale}
      currentPage={page}
      fetchPayloadUrl={`/api/vitrin/collection-frame?${q.toString()}`}
    />
  );
}
