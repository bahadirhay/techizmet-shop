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

  if (process.env.NODE_ENV === "production") {
    const q = new URLSearchParams({ slug, page: String(page) });
    if (categorySlug) q.set("category", categorySlug);
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

  const payloadPromise = getCollectionFramePayload(
    site.id,
    slug,
    locale,
    categorySlug,
    page,
    title,
  );

  return (
    <MirrorCollectionFrameHost
      src={src}
      title={frameTitle}
      locale={locale}
      currentPage={page}
      payloadPromise={payloadPromise}
    />
  );
}
