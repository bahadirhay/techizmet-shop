import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductsBulkTable } from "@/components/admin/ProductsBulkTable";
import { ProductsExcelPanel } from "@/components/admin/ProductsExcelPanel";
import { btnPrimary } from "@/components/admin/AdminForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function ProductsPage() {
  const auth = await requireStaffPage();
  const [products, categories, brands, marketplaceListings] = await Promise.all([
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
    prisma.marketplaceProductListing.findMany({
      where: { siteId: auth.siteId },
      select: { productId: true, platform: true, listingStatus: true },
    }),
  ]);

  const listingsByProduct = new Map<string, { platform: string; status: string }[]>();
  for (const listing of marketplaceListings) {
    const list = listingsByProduct.get(listing.productId) ?? [];
    list.push({ platform: listing.platform, status: listing.listingStatus });
    listingsByProduct.set(listing.productId, list);
  }

  const rows = products.map((p) => ({
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
    marketplaces: listingsByProduct.get(p.id) ?? [],
  }));

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ürünler" }]}
        title="Ürün yönetimi"
        description="Çoklu seçim, Excel dışa/içe aktarma, toplu yayın ve stok. Pazaryeri rozetleri: entegrasyon → Katalog çek."
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
      <ProductsExcelPanel />
      <ProductsBulkTable products={rows} categories={categories} brands={brands} />
    </div>
  );
}
