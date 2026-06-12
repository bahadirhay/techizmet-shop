import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MirrorProductFrame } from "@/components/store/MirrorProductFrame";
import { JsonLdScript } from "@/components/store/JsonLdScript";
import { ProductSeoShell } from "@/components/store/ProductSeoShell";
import { resolveMirrorProductTemplateSlug } from "@/lib/mirror-html-path";
import { ProductPurchasePanel } from "@/components/store/ProductPurchasePanel";
import { localeFromCookieValue } from "@/lib/i18n/locale";
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
import { resolvePublicMediaUrl } from "@/lib/product-media";
import { getDefaultSite } from "@/lib/site";

/** Admin’de kaydedilen ürün altı metinleri gecikmesiz yansısın */
export const revalidate = 0;

export async function generateStaticParams() {
  try {
    const site = await getDefaultSite();
    const rows = await prisma.storeProduct.findMany({
      where: { siteId: site.id, published: true },
      select: { slug: true },
    });
    return rows.map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

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

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await headers();
  const locale = localeFromCookieValue(h.get("x-shop-locale") ?? undefined) ?? "tr";
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);
  const seoCtx = await loadPublishedProductSeo(slug);
  const jsonLd = await buildProductPageJsonLd(slug);

  const mirrorTemplateSlug = homepageMode === "mirror" ? resolveMirrorProductTemplateSlug(slug) : null;
  if (homepageMode === "mirror" && mirrorTemplateSlug) {
    if (!seoCtx) notFound();

    const breadcrumbs = breadcrumbItemsToNav(buildProductBreadcrumbItems(seoCtx.product));

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
              gallery.map((item, i) =>
                item.mediaType === "video" ? (
                  <video
                    key={`${item.url}-${i}`}
                    src={item.url}
                    controls
                    playsInline
                    muted
                    loop
                    className="kn-pdp__img w-full"
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${item.url}-${i}`}
                    src={resolvePublicMediaUrl(item.url)}
                    alt={i === 0 ? displayTitle : `${displayTitle} — ${i + 1}`}
                    className="kn-pdp__img"
                  />
                ),
              )
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
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            ) : null}
            <p className="mt-4">
              <Link href="/">← Mağazaya dön</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
