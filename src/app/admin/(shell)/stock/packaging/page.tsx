import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StockPackagingManager } from "@/components/admin/StockPackagingManager";
import { loadRecipesForSite } from "@/lib/stock/packaging";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function StockPackagingPage() {
  const auth = await requireStaffPage();

  const [stockItems, products, recipes] = await Promise.all([
    prisma.stockItem.findMany({
      where: { siteId: auth.siteId, active: true },
      select: { id: true, name: true, unit: true, kind: true, balanceBase: true },
      orderBy: { name: "asc" },
    }),
    prisma.storeProduct.findMany({
      where: { siteId: auth.siteId, published: true, kind: "standard" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 200,
    }),
    loadRecipesForSite(auth.siteId, prisma),
  ]);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Stok", href: "/admin/stock" }, { label: "Paketleme" }]}
        title="Paketleme & reçete"
        description="Hammadde ve ambalajdan mamul üretimi — kg → adet dönüşümü."
      />
      <StockPackagingManager stockItems={stockItems} products={products} recipes={recipes} />
    </div>
  );
}
