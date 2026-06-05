import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { loadCatalogOptions } from "@/lib/admin/catalog-options";
import { productToForm } from "@/lib/admin/product-form";
import { loadActiveMarketplacePlatforms } from "@/lib/marketplace/active-integrations";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";
import { getProductBarcodeSettings } from "@/lib/admin/product-barcode";
import { getDefaultProductExploreLooks, getHomepageMode, getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffPage();
  const { id } = await params;
  const product = await prisma.storeProduct.findFirst({
    where: { id, siteId: auth.siteId },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      descriptionHtml: true,
      keyFeaturesHtml: true,
      howToUseHtml: true,
      highlightsJson: true,
      exploreLooksJson: true,
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
      stockQty: true,
      lowStockThreshold: true,
      weightGrams: true,
      desi: true,
      seoTitle: true,
      seoDescription: true,
      imageUrl: true,
      badgesJson: true,
      variantOptionName: true,
      published: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, sortOrder: true, mediaType: true } },
      variants: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          sku: true,
          priceMinor: true,
          compareAtMinor: true,
          stockQty: true,
          isDefault: true,
          sortOrder: true,
        },
      },
    },
  });
  if (!product) notFound();

  const [catalog, allProducts, settings, activeMarketplaces] = await Promise.all([
    loadCatalogOptions(auth.siteId),
    prisma.storeProduct.findMany({
      where: { siteId: auth.siteId, published: true },
      orderBy: { title: "asc" },
      select: { slug: true, title: true },
    }),
    getSiteSettings(auth.siteId),
    loadActiveMarketplacePlatforms(auth.siteId),
  ]);
  const { collections, categories, brands } = catalog;

  const formInitial = productToForm(product, activeMarketplaces);
  const siteDefaultExplore = getDefaultProductExploreLooks(settings);
  const { autoGenerate: defaultAutoGenerateBarcode } = getProductBarcodeSettings(settings);

  return (
    <ProductForm
      key={`${product.id}-${formInitial.mediaItems.length}`}
      initial={formInitial}
      collections={collections}
      categories={categories}
      brands={brands}
      allProducts={allProducts}
      siteDefaultExplore={siteDefaultExplore}
      activeMarketplaces={activeMarketplaces}
      defaultAutoGenerateBarcode={defaultAutoGenerateBarcode && !formInitial.barcode.trim()}
      homepageMode={getHomepageMode(settings)}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? ""}
    />
  );
}
