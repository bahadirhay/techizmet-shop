import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StockItemsManager } from "@/components/admin/StockAdminViews";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function StockItemsPage() {
  const auth = await requireStaffPage();
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
        description="Hammadde (kg), ambalaj (adet) ve mamul kartları. Manuel giriş, sayım ve düzeltmeler hareket defterine yazılır."
      />
      <StockItemsManager initialItems={items} />
    </div>
  );
}
