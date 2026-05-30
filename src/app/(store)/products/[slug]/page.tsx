import Link from "next/link";
import { notFound } from "next/navigation";
import { MirrorProductFrame } from "@/components/store/MirrorProductFrame";
import { resolveMirrorProductTemplateSlug } from "@/lib/mirror-html-path";
import { ProductPurchasePanel } from "@/components/store/ProductPurchasePanel";
import { prisma } from "@/lib/prisma";
import { getStoreLocale } from "@/lib/i18n/server";
import { getStoreHomepageMode } from "@/lib/site-settings";
import { getLoggedInCustomerPricing } from "@/lib/store/customer-pricing";
import { getDefaultSite } from "@/lib/site";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getDefaultSite();
  const homepageMode = await getStoreHomepageMode(site.id);
  const locale = await getStoreLocale();

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
