import { BundleForm } from "@/components/admin/BundleForm";
import { emptyBundleForm } from "@/lib/admin/bundle-form";
import { loadCatalogOptions } from "@/lib/admin/catalog-options";
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

export const dynamic = "force-dynamic";

export default async function NewBundlePage() {
  const auth = await requireStaffPage();
  const [catalog, settings, activeMarketplaces, site] = await Promise.all([
    loadCatalogOptions(auth.siteId),
    getSiteSettings(auth.siteId),
    loadActiveMarketplacePlatforms(auth.siteId),
    getDefaultSite(),
  ]);
  const { collections, categories, brands } = catalog;
  const { autoGenerate: defaultAutoGenerateBarcode } = getProductBarcodeSettings(settings);
  const siteName = getSiteSeo(settings, site.name).siteTitle;

  return (
    <BundleForm
      initial={emptyBundleForm()}
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
