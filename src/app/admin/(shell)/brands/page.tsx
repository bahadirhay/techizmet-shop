import Link from "next/link";
import { AdminListRowActions } from "@/components/admin/AdminListRowActions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { btnPrimary } from "@/components/admin/AdminForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function BrandsPage() {
  const auth = await requireStaffPage();
  const brands = await prisma.storeBrand.findMany({
    where: { siteId: auth.siteId },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ürünler", href: "/admin/products" }, { label: "Markalar" }]}
        title="Marka yönetimi"
        description="Ürün markası ve logo. Liste üzerinden düzenle, aktif/pasif yap veya sil."
        actions={
          <Link href="/admin/brands/new" className={btnPrimary}>
            + Yeni marka
          </Link>
        }
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Marka</th>
              <th>Slug</th>
              <th>Ürün</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id}>
                <td>
                  <div className="flex items-center gap-3">
                    {b.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-100 text-xs font-bold text-zinc-400">
                        {b.name.slice(0, 1)}
                      </div>
                    )}
                    <span className="font-medium">{b.name}</span>
                  </div>
                </td>
                <td className="font-mono text-xs text-zinc-500">/{b.slug}</td>
                <td>{b._count.products}</td>
                <td>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {b.active ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="text-right">
                  <AdminListRowActions
                    editHref={`/admin/brands/${b.id}/edit`}
                    apiUrl={`/api/admin/brands/${b.id}`}
                    enabled={b.active}
                    flagField="active"
                    deleteConfirmText={`${b.name} markasını silmek istediğinize emin misiniz?`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {brands.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Henüz marka yok.</p>
      ) : null}
    </div>
  );
}
