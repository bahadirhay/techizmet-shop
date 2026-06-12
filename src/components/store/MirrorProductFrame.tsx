import { notFound } from "next/navigation";
import { MirrorProductFrameClient } from "@/components/store/MirrorProductFrameClient";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  buildProductMirrorSrc,
  resolveMirrorProductTemplateSlug,
} from "@/lib/mirror-html-path";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { loadMirrorProductFramePayload } from "@/lib/mirror-product-frame-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

/** HTTrack mirror — ürün detay; DB fiyat/içerik istemci + API ile yansır */
export async function MirrorProductFrame({
  slug,
  locale,
  title,
  templateSlug,
  breadcrumbs = [],
}: {
  slug: string;
  locale: ShopLocale;
  title?: string;
  templateSlug?: string;
  breadcrumbs?: { name: string; href: string; current?: boolean }[];
}) {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const resolvedTemplateSlug = templateSlug ?? resolveMirrorProductTemplateSlug(slug);
  if (!resolvedTemplateSlug) notFound();

  const [payload, nav, footer] = await Promise.all([
    loadMirrorProductFramePayload(site.id, slug, locale),
    loadMirrorNavItems(site.id, locale),
    loadMirrorFooterData(site.id, locale),
  ]);
  if (!payload) notFound();

  const branding = getSiteBranding(settings);
  const src = await buildProductMirrorSrc(slug, locale, resolvedTemplateSlug);
  const frameTitle = title ?? `Product — ${slug}`;

  return (
    <MirrorProductFrameClient
      src={src}
      title={frameTitle}
      overlay={payload.overlay}
      productFromAdmin={payload.productFromAdmin}
      commerce={payload.commerce ?? undefined}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
      exploreLooks={payload.exploreLooks}
      exploreProductsBySlug={payload.exploreProductsBySlug}
      explorePrefetched
      productSlug={slug}
      templateMirrorSlug={resolvedTemplateSlug !== slug ? resolvedTemplateSlug : undefined}
      productPageBottom={payload.productPageBottom}
      breadcrumbs={breadcrumbs}
    />
  );
}
