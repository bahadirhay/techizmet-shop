import { readThemeShellPilotLive } from "@/lib/theme-shell-pilot-live";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MirrorProductFrame } from "@/components/store/MirrorProductFrame";
import { ThemeShellProductView } from "@/components/store/ThemeShellProductView";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { ProductSeoShell } from "@/components/store/ProductSeoShell";
import { ProductReviews } from "@/components/store/ProductReviews";
import { resolveMirrorProductTemplateSlug } from "@/lib/mirror-html-path";
import { ProductPurchasePanel } from "@/components/store/ProductPurchasePanel";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { breadcrumbItemsToNav, buildProductBreadcrumbItems } from "@/lib/seo/product-breadcrumbs";
import { buildProductPageJsonLd } from "@/lib/seo/product-page-json-ld";
import { loadPublishedProductSeo } from "@/lib/seo/product-seo";
import { buildSiteMetadata } from "@/lib/site-metadata";
import { getHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getLoggedInCustomerPricing } from "@/lib/store/customer-pricing";
import { formatProductDisplayTitle } from "@/lib/product-display-title";
import { loadResolvedBundleComponents, buildComponentsSnapshot } from "@/lib/product-bundle";
import { ProductGalleryMedia } from "@/components/store/ProductGalleryMedia";
import { sanitizePublicHtml } from "@/lib/html-sanitize";
import { getDefaultSite } from "@/lib/site";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { resolveThemeShellProductContent } from "@/lib/theme-shell-product-content";
import {
  isThemeShellEnabledForProductPath,
  type ThemeShellPilotQuery,
} from "@/lib/theme-shell-pilot";

/** Ürün güncellemeleri revalidateStorePublicCache ile anında yansır */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const base = await buildSiteMetadata();
  const seo = await loadPublishedProductSeo(slug);
  if (!seo) return base;

  return buildPageMetadata(base, {
    title: seo.metaTitle,
    description: seo.metaDescription,
    imageUrl: seo.imageUrl,
    canonicalPath: `/products/${slug}`,
  });
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ThemeShellPilotQuery>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const locale = await getStoreLocaleFromHeaders();
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);
  const themeShellLive = readThemeShellPilotLive();
  const seoCtx = await loadPublishedProductSeo(slug);
  const jsonLd = await buildProductPageJsonLd(slug);

  const mirrorTemplateSlug = homepageMode === "mirror" ? resolveMirrorProductTemplateSlug(slug) : null;

  if (homepageMode === "mirror" && mirrorTemplateSlug) {
    if (!seoCtx) notFound();

    const breadcrumbs = breadcrumbItemsToNav(buildProductBreadcrumbItems(seoCtx.product));

    const useThemeShell = isThemeShellEnabledForProductPath(
      `/products/${slug}`,
      query,
      themeShellLive,
    );

    if (useThemeShell) {
      const tenant = await ensureStoreTenant();
      const content = await resolveThemeShellProductContent(
        site.id,
        site.name,
        tenant.slug,
        slug,
        locale,
        breadcrumbs,
      );
      if (!content) notFound();
      return (
        <>
          {jsonLd ? <JsonLdScript data={jsonLd} /> : null}
          <ThemeShellProductView
            content={content}
            breadcrumbs={breadcrumbs}
            locale={locale}
          />
        </>
      );
    }

    return (
      <>
        {jsonLd ? <JsonLdScript data={jsonLd} /> : null}
        <MirrorProductFrame
          slug={slug}
          locale={locale}
          templateSlug={mirrorTemplateSlug}
          title={seoCtx.visibleTitle}
          breadcrumbs={breadcrumbs}
        />
      </>
    );
  }

  const product = await prisma.storeProduct.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
    include: {
      collection: { select: { slug: true, title: true } },
      category: {
        select: {
          slug: true,
          title: true,
          parent: { select: { slug: true, title: true } },
        },
      },
      categoryLinks: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: {
          category: {
            select: {
              slug: true,
              title: true,
              parent: { select: { slug: true, title: true } },
            },
          },
        },
      },
      variants: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product?.published) notFound();

  const bundleComponents =
    product.kind === "bundle"
      ? buildComponentsSnapshot(await loadResolvedBundleComponents(prisma, product.id), 1)
      : [];

  const gallery =
    product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [{ url: product.imageUrl, mediaType: "image" as const }]
        : [];

  const pricing = await getLoggedInCustomerPricing(site.id);
  const displayTitle = formatProductDisplayTitle({
    title: product.title,
    weightGrams: product.weightGrams,
    pieceCount: product.pieceCount,
  });
  const breadcrumbs = breadcrumbItemsToNav(buildProductBreadcrumbItems(product));
  const lead = product.description?.trim() || product.seoDescription?.trim() || null;

  return (
    <>
      {jsonLd ? <JsonLdScript data={jsonLd} /> : null}
      <div className="kn-section kn-pdp">
        <ProductSeoShell title={displayTitle} lead={lead} breadcrumbs={breadcrumbs} />
        <div className="kn-pdp__grid">
          <div className="space-y-2">
            {gallery.length === 0 ? (
              <div className="kn-pdp__img kn-product-card__img--placeholder" />
            ) : (
              gallery.map((item, i) => (
                <ProductGalleryMedia
                  key={`${item.url}-${i}`}
                  url={item.url}
                  mediaType={item.mediaType}
                  alt={i === 0 ? displayTitle : `${displayTitle} — ${i + 1}`}
                  priority={i === 0}
                />
              ))
            )}
          </div>
          <div>
            <ProductPurchasePanel
              productId={product.id}
              badgesJson={product.badgesJson}
              stockQty={product.stockQty}
              lowStockThreshold={product.lowStockThreshold}
              variantOptionName={product.variantOptionName}
              variants={product.variants}
              priceMinor={product.priceMinor}
              compareAtMinor={product.compareAtMinor}
              memberPricing={pricing}
            />
            {bundleComponents.length > 0 ? (
              <div className="kn-pdp__bundle mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm">
                <p className="font-medium text-violet-900">Paket içeriği</p>
                <ul className="mt-2 list-inside list-disc text-violet-950">
                  {bundleComponents.map((c) => (
                    <li key={`${c.productId}-${c.variantId ?? ""}`}>
                      {c.title}
                      {c.qty > 1 ? ` × ${c.qty}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {product.description ? <p className="kn-pdp__desc">{product.description}</p> : null}
            {product.descriptionHtml ? (
              <div
                className="kn-pdp__desc prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizePublicHtml(product.descriptionHtml) }}
              />
            ) : null}
            <p className="mt-4">
              <Link href="/">← Mağazaya dön</Link>
            </p>
          </div>
        </div>
      </div>
      <ProductReviews productId={product.id} productName={displayTitle} />
    </>
  );
}
