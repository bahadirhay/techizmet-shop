import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductsBulkTable } from "@/components/admin/ProductsBulkTable";
import { ProductsExcelPanel } from "@/components/admin/ProductsExcelPanel";
import { MarketplaceSyncAlertBanner } from "@/components/admin/MarketplaceSyncAlertBanner";
import { btnPrimary } from "@/components/admin/AdminForm";
import {
  getActiveMarketplacePlatforms,
  getMarketplaceSyncForProducts,
} from "@/lib/marketplace/get-product-marketplace-sync";
import type { MarketplaceSyncState } from "@/lib/marketplace/listing-sync-state";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function ProductsPage() {
  const auth = await requireStaffPage();
  const [products, categories, brands, activePlatforms] = await Promise.all([
    prisma.storeProduct.findMany({
      where: { siteId: auth.siteId },
      orderBy: { updatedAt: "desc" },
      include: {
        collection: true,
        category: true,
        brand: true,
        variants: { select: { id: true } },
      },
    }),
    prisma.storeCategory.findMany({
      where: { siteId: auth.siteId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.storeBrand.findMany({
      where: { siteId: auth.siteId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getActiveMarketplacePlatforms(auth.siteId),
  ]);

  const syncByProduct = await getMarketplaceSyncForProducts(
    auth.siteId,
    products.map((p) => ({ id: p.id, updatedAt: p.updatedAt })),
  );

  const rows = products.map((p) => {
    const marketplaceSync = syncByProduct.get(p.id);
    const marketplaces =
      marketplaceSync?.platforms.map((row) => ({
        platform: row.platform,
        status: row.listingStatus ?? "none",
        syncState: row.state as MarketplaceSyncState,
      })) ?? [];

    return {
      id: p.id,
      kind: p.kind,
      title: p.title,
      slug: p.slug,
      sku: p.sku,
      barcode: p.barcode,
      imageUrl: p.imageUrl,
      published: p.published,
      priceMinor: p.priceMinor,
      stockQty: p.stockQty,
      lowStockThreshold: p.lowStockThreshold,
      badgesJson: p.badgesJson,
      collectionTitle: p.collection?.title ?? null,
      categoryTitle: p.category?.title ?? null,
      brandName: p.brand?.name ?? null,
      variantCount: p.variants.length,
      marketplaces,
      marketplaceSync,
    };
  });

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ürünler" }]}
        title="Ürün yönetimi"
        description="Pazaryeri rozetleri: güncel, güncelleme bekliyor (!) veya pazaryerinde yok. İçerik gönderdikten sonra rozet yeşile döner."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/categories"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            >
              Kategoriler
            </Link>
            <Link
              href="/admin/brands"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            >
              Markalar
            </Link>
            <Link
              href="/admin/products/pricing"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            >
              Toplu fiyat
            </Link>
            <Link
              href="/admin/bundles/new"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            >
              + Yeni paket
            </Link>
            <Link href="/admin/products/new" className={btnPrimary}>
              + Yeni ürün
            </Link>
          </div>
        }
      />
      <MarketplaceSyncAlertBanner />
      <ProductsExcelPanel />
      <ProductsBulkTable
        products={rows}
        categories={categories}
        brands={brands}
        hasActiveMarketplaces={activePlatforms.length > 0}
      />
    </div>
  );
}
