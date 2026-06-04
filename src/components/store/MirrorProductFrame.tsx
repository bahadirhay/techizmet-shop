import { notFound } from "next/navigation";
import { MirrorProductFrameClient } from "@/components/store/MirrorProductFrameClient";
import type { ShopLocale } from "@/lib/i18n/locale";
import { parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import {
  buildProductMirrorSrc,
  productMirrorFileRel,
  resolveMirrorProductTemplateSlug,
} from "@/lib/mirror-html-path";
import { hasPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt";
import { loadMirrorProductCommerce } from "@/lib/mirror-product-commerce-server";
import { loadMirrorProductFramePayload } from "@/lib/mirror-product-frame-server";
import { getProductPageBottomSettings } from "@/lib/product-page-bottom";
import { getDefaultSite } from "@/lib/site";

/** HTTrack mirror — ürün detay; prod: iframe anında, DB yaması prebuild’de */
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
  const resolvedTemplateSlug = templateSlug ?? resolveMirrorProductTemplateSlug(slug);
  if (!resolvedTemplateSlug) notFound();

  const src = buildProductMirrorSrc(slug, locale, resolvedTemplateSlug);
  const frameTitle = title ?? `Product — ${slug}`;
  const siteRow = await prisma.storeSite.findUnique({ where: { id: site.id } });
  const settings = parseSiteSettings(siteRow?.settingsJson ?? null);
  const productPageBottom = getProductPageBottomSettings(settings, locale);

  const productPrebuilt = hasPrebuiltMirrorHtml(productMirrorFileRel(slug, locale));
  const commerceForShare = await loadMirrorProductCommerce(
    site.id,
    slug,
    locale,
    settings.store?.texts,
  );

  if (process.env.NODE_ENV === "production" || productPrebuilt) {
    return (
      <MirrorProductFrameClient
        src={src}
        title={frameTitle}
        productSlug={slug}
        locale={locale}
        productPageBottom={productPageBottom}
        share={commerceForShare?.share}
      />
    );
  }

  const payload = await loadMirrorProductFramePayload(site.id, slug, locale);
  if (!payload) notFound();

  return (
    <MirrorProductFrameClient
      src={src}
      title={frameTitle}
      overlay={payload.overlay}
      productFromAdmin={payload.productFromAdmin}
      commerce={payload.commerce ?? undefined}
      locale={locale}
      exploreLooks={[]}
      exploreProductsBySlug={{}}
      productSlug={slug}
      productPageBottom={payload.productPageBottom}
    />
  );
}
