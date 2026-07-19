import { notFound, redirect } from "next/navigation";
import { BundleForm } from "@/components/admin/BundleForm";
import { bundleToForm } from "@/lib/admin/bundle-form";
import { loadCatalogOptions } from "@/lib/admin/catalog-options";
import { loadActiveMarketplacePlatforms } from "@/lib/marketplace/active-integrations";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";
import { getProductBarcodeSettings } from "@/lib/admin/product-barcode";
import { getHomepageMode, getSiteSettings, getSiteSeo } from "@/lib/site-settings";
import {
  resolvePackagingCostMinor,
  resolveWebShippingCostMinor,
} from "@/lib/finance/economics-settings";
import { resolveCardFeePercent } from "@/lib/finance/payment-fee";
import { getDefaultSite } from "@/lib/site";
import { PRODUCT_KIND_BUNDLE, loadResolvedBundleComponents } from "@/lib/product-bundle";

export const dynamic = "force-dynamic";

export default async function EditBundlePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;

  const product = await prisma.storeProduct.findFirst({
    where: { id, siteId: auth.siteId },
    select: {
      id: true,
      kind: true,
      title: true,
      slug: true,
      description: true,
      descriptionHtml: true,
      keyFeaturesHtml: true,
      howToUseHtml: true,
      sku: true,
      barcode: true,
      collectionId: true,
      categoryId: true,
      categoryLinks: { orderBy: { sortOrder: "asc" }, select: { categoryId: true, sortOrder: true } },
      brandId: true,
      priceMinor: true,
      compareAtMinor: true,
      costMinor: true,
      vatRate: true,
      marketplacePricesJson: true,
      marketplaceMarkupPercentJson: true,
      stockQty: true,
      lowStockThreshold: true,
      weightGrams: true,
      pieceCount: true,
      desi: true,
      seoTitle: true,
      seoDescription: true,
      imageUrl: true,
      badgesJson: true,
      published: true,
      storeVisible: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, sortOrder: true, mediaType: true } },
      bundleComponents: {
        orderBy: { sortOrder: "asc" },
        include: {
          componentProduct: { select: { title: true } },
          componentVariant: { select: { label: true } },
        },
      },
    },
  });
  if (!product) notFound();
  if (product.kind !== PRODUCT_KIND_BUNDLE) {
    redirect(`/admin/products/${id}/edit`);
  }

  const resolved = await loadResolvedBundleComponents(prisma, id);
  const stockByKey = new Map(
    resolved.map((c) => [`${c.productId}:${c.variantId ?? ""}`, c.stockQty]),
  );

  const [catalog, settings, activeMarketplaces, site] = await Promise.all([
    loadCatalogOptions(auth.siteId),
    getSiteSettings(auth.siteId),
    loadActiveMarketplacePlatforms(auth.siteId),
    getDefaultSite(),
  ]);
  const { collections, categories, brands } = catalog;

  const formInitial = bundleToForm(product, activeMarketplaces);
  formInitial.components = formInitial.components.map((c) => ({
    ...c,
    stockQty: stockByKey.get(`${c.productId}:${c.variantId ?? ""}`) ?? c.stockQty,
  }));

  const { autoGenerate: defaultAutoGenerateBarcode } = getProductBarcodeSettings(settings);
  const siteName = getSiteSeo(settings, site.name).siteTitle;

  return (
    <BundleForm
      key={`${product.id}-${formInitial.mediaItems.length}`}
      initial={formInitial}
      collections={collections}
      categories={categories}
      brands={brands}
      activeMarketplaces={activeMarketplaces}
      defaultAutoGenerateBarcode={defaultAutoGenerateBarcode && !formInitial.barcode.trim()}
      homepageMode={getHomepageMode(settings)}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
      siteName={siteName}
      webShippingCostMinor={resolveWebShippingCostMinor(settings)}
      packagingCostMinor={resolvePackagingCostMinor(settings)}
      cardFeePercent={resolveCardFeePercent(settings)}
      freeShippingOverMinor={settings.store?.freeShippingOverMinor ?? 0}
    />
  );
}
