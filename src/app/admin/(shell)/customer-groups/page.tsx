import Link from "next/link";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function CustomerGroupsPage() {
  const auth = await requireStaffPage();
  const groups = await prisma.customerGroup.findMany({
    where: { siteId: auth.siteId },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Üye grupları</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Kayıtlı müşterileri gruba ekleyin; grup indirimi satış fiyatı üzerinden uygulanır.
          </p>
        </div>
        <Link href="/admin/customer-groups/new" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
          Yeni grup
        </Link>
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b text-zinc-500">
            <th className="py-2">Grup</th>
            <th>İndirim</th>
            <th>Üye</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className="border-b">
              <td className="py-2">
                <Link href={`/admin/customer-groups/${g.id}/edit`} className="font-medium text-[var(--kn-brand)] underline">
                  {g.name}
                </Link>
              </td>
              <td>%{g.discountPercent}</td>
              <td>{g._count.members}</td>
              <td>{g.active ? "Aktif" : "Pasif"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {groups.length === 0 ? (
        <p className="mt-8 text-zinc-500">Henüz grup yok. Örn. %15 indirimli &quot;Bayi&quot; grubu oluşturun.</p>
      ) : null}
    </div>
  );
}
