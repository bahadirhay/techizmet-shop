import { MirrorCollectionFrameHost } from "@/components/store/MirrorCollectionFrameHost";
import type { ActiveCollectionFilters } from "@/lib/collection-filter-facets";
import { emptyActiveCollectionFilters, hasActiveCollectionFilters } from "@/lib/collection-filter-facets";
import type { ShopLocale } from "@/lib/i18n/locale";
import { getCollectionFramePayload } from "@/lib/mirror-collection-frame-server";
import {
  collectionMirrorFileRel,
  resolveMirrorCollectionTemplateSlug,
} from "@/lib/mirror-html-path";
import { buildCollectionMirrorSrc } from "@/lib/mirror-html-path-server";
import { hasPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt";
import { getDefaultSite } from "@/lib/site";
import { ensureStoreTenant } from "@/lib/store-tenant";

/** Koleksiyon/kategori — kategori: sunucu HTML; tüm ürünler: iframe + JSON */
export async function MirrorCollectionFrame({
  slug,
  locale,
  title,
  categorySlug,
  page = 1,
  activeFilters = emptyActiveCollectionFilters(),
}: {
  slug: string;
  locale: ShopLocale;
  title?: string;
  categorySlug?: string;
  page?: number;
  activeFilters?: ActiveCollectionFilters;
}) {
  const templateSlug = categorySlug
    ? "all"
    : (resolveMirrorCollectionTemplateSlug(slug) ?? slug);
  const src = await buildCollectionMirrorSrc(slug, locale, templateSlug, categorySlug, page, title);
  const frameTitle = title ?? `Collection — ${slug}`;
  const site = await getDefaultSite();
  const tenant = await ensureStoreTenant();
  const initialPayload = await getCollectionFramePayload(
    site.id,
    tenant.databaseUrl,
    slug,
    locale,
    categorySlug?.trim() || undefined,
    page,
    title,
    activeFilters,
  );

  if (categorySlug?.trim()) {
    return (
      <MirrorCollectionFrameHost
        src={src}
        title={frameTitle}
        locale={locale}
        currentPage={page}
        initialPayload={initialPayload}
        productsPrebuilt={!hasActiveCollectionFilters(activeFilters)}
      />
    );
  }

  const allPrebuiltRel = collectionMirrorFileRel("all", locale);
  const productsPrebuiltAll =
    page === 1 &&
    slug === "all" &&
    !categorySlug?.trim() &&
    !hasActiveCollectionFilters(activeFilters) &&
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
