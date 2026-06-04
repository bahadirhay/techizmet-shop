import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MirrorProductFrame } from "@/components/store/MirrorProductFrame";
import { resolveMirrorProductTemplateSlug } from "@/lib/mirror-html-path";
import { ProductPurchasePanel } from "@/components/store/ProductPurchasePanel";
import { localeFromCookieValue } from "@/lib/i18n/locale";
import { prisma } from "@/lib/prisma";
import { getHomepageMode, getSiteSettings } from "@/lib/site-settings";
import { getLoggedInCustomerPricing } from "@/lib/store/customer-pricing";
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

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await headers();
  const locale = localeFromCookieValue(h.get("x-shop-locale") ?? undefined) ?? "tr";
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const homepageMode = getHomepageMode(settings);

  const mirrorTemplateSlug = homepageMode === "mirror" ? resolveMirrorProductTemplateSlug(slug) : null;
  if (homepageMode === "mirror" && mirrorTemplateSlug) {
    return <MirrorProductFrame slug={slug} locale={locale} templateSlug={mirrorTemplateSlug} />;
  }

  const product = await prisma.storeProduct.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
    include: {
      variants: { orderBy: { sortOrder: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product?.published) notFound();

  const gallery =
    product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [{ url: product.imageUrl, mediaType: "image" as const }]
        : [];

  const pricing = await getLoggedInCustomerPricing(site.id);
  const memberPricing = pricing;

  return (
    <div className="kn-section kn-pdp">
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
                <img key={`${item.url}-${i}`} src={item.url} alt="" className="kn-pdp__img" />
              ),
            )
          )}
        </div>
        <div>
          <h1>{product.title}</h1>
          <ProductPurchasePanel
            productId={product.id}
            badgesJson={product.badgesJson}
            stockQty={product.stockQty}
            lowStockThreshold={product.lowStockThreshold}
            variantOptionName={product.variantOptionName}
            variants={product.variants}
            priceMinor={product.priceMinor}
            compareAtMinor={product.compareAtMinor}
            memberPricing={memberPricing}
          />
          {product.description ? <p className="kn-pdp__desc">{product.description}</p> : null}
          <p className="mt-4">
            <Link href="/">← Mağazaya dön</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
