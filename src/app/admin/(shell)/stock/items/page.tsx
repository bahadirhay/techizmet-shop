import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StockItemsManager } from "@/components/admin/StockAdminViews";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { syncFinishedProductsToStock } from "@/lib/stock/sync-products";

export default async function StockItemsPage() {
  const auth = await requireStaffPage();

  let syncNote: string | null = null;
  try {
    const result = await syncFinishedProductsToStock(prisma, auth.siteId);
    if (result.created > 0 || result.updated > 0) {
      syncNote = `${result.created} yeni mamul kartı, ${result.updated} güncelleme (${result.totalProducts} ürün).`;
    }
  } catch {
    /* senkron isteğe bağlı */
  }

  const items = await prisma.stockItem.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: {
      product: { select: { id: true, title: true } },
    },
  });

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Stok", href: "/admin/stock" }, { label: "Kartlar" }]}
        title="Stok kartları"
        description="Hammadde, ambalaj ve mamul kartları. Mamüller sayfa açılışında ürün kataloğuyla senkron tutulur."
      />
      {syncNote ? (
        <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900">{syncNote}</p>
      ) : null}
      <StockItemsManager initialItems={items} />
    </div>
  );
}
