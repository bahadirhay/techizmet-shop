import { notFound } from "next/navigation";
import { MirrorProductFrameClient } from "@/components/store/MirrorProductFrameClient";
import { loadExploreOverlayProducts } from "@/lib/explore-overlay-products";
import type { ShopLocale } from "@/lib/i18n/locale";
import { toBrandedMirrorSrc } from "@/lib/mirror-html-branding";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import type { VitrinProductDetail } from "@/lib/mirror-product-detail-sync";
import { loadMirrorProductCommerce } from "@/lib/mirror-product-commerce-server";
import { resolveMirrorProductTemplateSlug } from "@/lib/mirror-html-path";
import {
  getProductPageBottomSettings,
  getSiteBranding,
  getSiteSettings,
  resolveProductExploreLooks,
} from "@/lib/site-settings";
import type { ProductPageBottomSettings } from "@/lib/product-page-bottom";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

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
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);
  const commerce = await loadMirrorProductCommerce(site.id, slug, locale, settings.store?.texts);

  const product = await prisma.storeProduct.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product?.published) notFound();

  const resolvedTemplateSlug = templateSlug ?? resolveMirrorProductTemplateSlug(slug) ?? slug;

  const src = toBrandedMirrorSrc(
    locale === "tr"
      ? `theme/king-noor/mirror/products/${resolvedTemplateSlug}-tr.html`
      : `theme/king-noor/mirror/products/${resolvedTemplateSlug}.html`,
  );

  const overlay =
    product.description ||
    product.descriptionHtml ||
    product.keyFeaturesHtml ||
    product.howToUseHtml
      ? {
          description: product.description,
          descriptionHtml: product.descriptionHtml,
          keyFeaturesHtml: product.keyFeaturesHtml,
          howToUseHtml: product.howToUseHtml,
        }
      : undefined;

  const productFromAdmin: VitrinProductDetail = {
    productId: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    imageUrl: product.imageUrl,
    images: product.images.map((image) => ({
      url: image.url,
      alt: image.alt,
      mediaType: image.mediaType === "video" ? "video" : "image",
    })),
    variantOptionName: product.variantOptionName,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      stockQty: variant.stockQty,
      isDefault: variant.isDefault,
    })),
  };

  const productPageBottom: ProductPageBottomSettings = getProductPageBottomSettings(settings);

  const exploreLooks = await resolveProductExploreLooks(
    site.id,
    product.exploreLooksJson ?? null,
  );
  const allSlugs = exploreLooks.flatMap((l) => l.productSlugs);
  const exploreProductsBySlug = await loadExploreOverlayProducts(site.id, allSlugs);

  return (
    <MirrorProductFrameClient
      src={src}
      title={title ?? `Product — ${slug}`}
      overlay={overlay}
      productFromAdmin={productFromAdmin}
      commerce={commerce ?? undefined}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
      exploreLooks={exploreLooks}
      exploreProductsBySlug={exploreProductsBySlug}
      productPageBottom={productPageBottom}
    />
  );
}
