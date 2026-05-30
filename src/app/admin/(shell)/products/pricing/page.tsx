import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BulkPricingPanel } from "@/components/admin/BulkPricingPanel";
import { btnSecondary } from "@/components/admin/AdminForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function BulkPricingPage() {
  const auth = await requireStaffPage();

  const [categories, collections, brands] = await Promise.all([
    prisma.storeCategory.findMany({
      where: { siteId: auth.siteId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.storeCollection.findMany({
      where: { siteId: auth.siteId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.storeBrand.findMany({
      where: { siteId: auth.siteId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ürünler", href: "/admin/products" },
          { label: "Toplu fiyat" },
        ]}
        title="Toplu fiyat güncelleme"
        description="Kategori, koleksiyon veya stok aralığına göre fiyatları toplu güncelleyin; önizleyin ve gerekirse geri alın."
        actions={
          <Link href="/admin/products" className={btnSecondary}>
            ← Ürün listesi
          </Link>
        }
      />
      <BulkPricingPanel
        categories={categories.map((c) => ({ id: c.id, label: c.title }))}
        collections={collections.map((c) => ({ id: c.id, label: c.title }))}
        brands={brands.map((b) => ({ id: b.id, label: b.name }))}
      />
    </div>
  );
}
