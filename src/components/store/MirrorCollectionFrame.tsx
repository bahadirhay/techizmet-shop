import { MirrorCollectionFrameHost } from "@/components/store/MirrorCollectionFrameHost";
import type { ShopLocale } from "@/lib/i18n/locale";
import { getCollectionFramePayload } from "@/lib/mirror-collection-frame-server";
import {
  buildCollectionMirrorSrc,
  resolveMirrorCollectionTemplateSlug,
} from "@/lib/mirror-html-path";
import { getDefaultSite } from "@/lib/site";

/** HTTrack mirror — prod: iframe anında + JSON; dev: sunucu payload */
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
  const site = await getDefaultSite();
  const templateSlug = categorySlug
    ? "all"
    : (resolveMirrorCollectionTemplateSlug(slug) ?? slug);
  const src = buildCollectionMirrorSrc(slug, locale, templateSlug);
  const frameTitle = title ?? `Collection — ${slug}`;

  const initialPayload = await getCollectionFramePayload(
    site.id,
    slug,
    locale,
    categorySlug,
    page,
    title,
  );

  if (process.env.NODE_ENV === "production") {
    return (
      <MirrorCollectionFrameHost
        src={src}
        title={frameTitle}
        locale={locale}
        currentPage={page}
        initialPayload={initialPayload}
        activeCategorySlug={categorySlug}
      />
    );
  }

  return (
    <MirrorCollectionFrameHost
      src={src}
      title={frameTitle}
      locale={locale}
      currentPage={page}
      initialPayload={initialPayload}
      activeCategorySlug={categorySlug}
    />
  );
}
