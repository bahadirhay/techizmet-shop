import { ProductForm } from "@/components/admin/ProductForm";
import { loadCatalogOptions } from "@/lib/admin/catalog-options";
import { emptyProductForm } from "@/lib/admin/product-form";
import { loadActiveMarketplacePlatforms } from "@/lib/marketplace/active-integrations";
import { requireStaffPage } from "@/lib/staff-auth";
import { getProductBarcodeSettings } from "@/lib/admin/product-barcode";
import { getHomepageMode, getSiteSettings, getSiteSeo } from "@/lib/site-settings";
import {
  resolvePackagingCostMinor,
  resolveWebShippingCostMinor,
} from "@/lib/finance/economics-settings";
import { resolveCardFeePercent } from "@/lib/finance/payment-fee";
import { getDefaultSite } from "@/lib/site";

export default async function NewProductPage() {
  const auth = await requireStaffPage();
  const [{ collections, categories, brands }, activeMarketplaces, settings, site] = await Promise.all([
    loadCatalogOptions(auth.siteId),
    loadActiveMarketplacePlatforms(auth.siteId),
    getSiteSettings(auth.siteId),
    getDefaultSite(),
  ]);
  const { autoGenerate: defaultAutoGenerateBarcode } = getProductBarcodeSettings(settings);
  const siteName = getSiteSeo(settings, site.name).siteTitle;

  return (
    <ProductForm
      initial={emptyProductForm()}
      collections={collections}
      categories={categories}
      brands={brands}
      activeMarketplaces={activeMarketplaces}
      defaultAutoGenerateBarcode={defaultAutoGenerateBarcode}
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
