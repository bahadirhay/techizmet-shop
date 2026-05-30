import { ProductForm } from "@/components/admin/ProductForm";
import { loadCatalogOptions } from "@/lib/admin/catalog-options";
import { emptyProductForm } from "@/lib/admin/product-form";
import { loadActiveMarketplacePlatforms } from "@/lib/marketplace/active-integrations";
import { requireStaffPage } from "@/lib/staff-auth";
import { getProductBarcodeSettings } from "@/lib/admin/product-barcode";
import { getSiteSettings } from "@/lib/site-settings";

export default async function NewProductPage() {
  const auth = await requireStaffPage();
  const [{ collections, categories, brands }, activeMarketplaces, settings] = await Promise.all([
    loadCatalogOptions(auth.siteId),
    loadActiveMarketplacePlatforms(auth.siteId),
    getSiteSettings(auth.siteId),
  ]);
  const { autoGenerate: defaultAutoGenerateBarcode } = getProductBarcodeSettings(settings);

  return (
    <ProductForm
      initial={emptyProductForm()}
      collections={collections}
      categories={categories}
      brands={brands}
      activeMarketplaces={activeMarketplaces}
      defaultAutoGenerateBarcode={defaultAutoGenerateBarcode}
    />
  );
}
