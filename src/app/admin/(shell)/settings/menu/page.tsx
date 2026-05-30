import { NavMenuEditor } from "@/components/admin/NavMenuEditor";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function StoreMenuAdminPage() {
  const auth = await requireStaffPage();

  const items = await prisma.navMenuItem.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { labelTr: "asc" }],
  });

  const categoryCount = await prisma.storeCategory.count({ where: { siteId: auth.siteId } });

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Menü & kategoriler</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Her satır: Türkçe / English etiket, sonra <strong>Sayfa</strong> veya{" "}
          <strong>Kategori</strong> seçin. Kategori seçince o kategorideki ürünler listelenir.
        </p>
      </div>
      <NavMenuEditor initialItems={items} categoryCount={categoryCount} />
    </div>
  );
}
