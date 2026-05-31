import { notFound } from "next/navigation";
import { MirrorProductFrameClient } from "@/components/store/MirrorProductFrameClient";
import type { ShopLocale } from "@/lib/i18n/locale";
import { toBrandedMirrorSrc } from "@/lib/mirror-html-branding";
import { resolveMirrorProductTemplateSlug } from "@/lib/mirror-html-path";
import { loadMirrorProductFramePayload } from "@/lib/mirror-product-frame-server";
import { getDefaultSite } from "@/lib/site";

/** HTTrack mirror — ürün detay; DB içeriği iframe’e yansıtılır */
export async function MirrorProductFrame({
  slug,
  locale,
  title,
  templateSlug,
}: {
  slug: string;
  locale: ShopLocale;
  title?: string;
  templateSlug?: string;
}) {
  const site = await getDefaultSite();
  const payload = await loadMirrorProductFramePayload(site.id, slug, locale);
  if (!payload) notFound();

  const resolvedTemplateSlug = templateSlug ?? resolveMirrorProductTemplateSlug(slug) ?? slug;

  const src = toBrandedMirrorSrc(
    locale === "tr"
      ? `theme/techizmet-shop/mirror/products/${resolvedTemplateSlug}-tr.html`
      : `theme/techizmet-shop/mirror/products/${resolvedTemplateSlug}.html`,
  );

  return (
    <MirrorProductFrameClient
      src={src}
      title={title ?? `Product — ${slug}`}
      overlay={payload.overlay}
      productFromAdmin={payload.productFromAdmin}
      commerce={payload.commerce ?? undefined}
      locale={locale}
      exploreLooks={payload.exploreLooks}
      exploreProductsBySlug={payload.exploreProductsBySlug}
      productPageBottom={payload.productPageBottom}
    />
  );
}
