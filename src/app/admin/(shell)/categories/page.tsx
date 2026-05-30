import Link from "next/link";
import { AdminListRowActions } from "@/components/admin/AdminListRowActions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { btnPrimary } from "@/components/admin/AdminForm";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

function categoryPath(
  cat: { id: string; title: string; parentId: string | null },
  byId: Map<string, { title: string; parentId: string | null }>
): string {
  const parts: string[] = [cat.title];
  let pid = cat.parentId;
  while (pid) {
    const p = byId.get(pid);
    if (!p) break;
    parts.unshift(p.title);
    pid = p.parentId;
  }
  return parts.join(" / ");
}

export default async function CategoriesPage() {
  const auth = await requireStaffPage();
  const categories = await prisma.storeCategory.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      parent: { select: { title: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  const byId = new Map(categories.map((c) => [c.id, { title: c.title, parentId: c.parentId }]));

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[
          { label: "Ürünler", href: "/admin/products" },
          { label: "Kategoriler" },
        ]}
        title="Kategori yönetimi"
        description="Hiyerarşik kategori ağacı. Liste üzerinden düzenle, aktif/pasif yap veya sil."
        actions={
          <Link href="/admin/categories/new" className={btnPrimary}>
            + Yeni kategori
          </Link>
        }
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Slug</th>
              <th>Ürün</th>
              <th>Alt</th>
              <th>Sıra</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{categoryPath(c, byId)}</td>
                <td className="font-mono text-xs text-zinc-500">/{c.slug}</td>
                <td>{c._count.products}</td>
                <td>{c._count.children}</td>
                <td>{c.sortOrder}</td>
                <td>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {c.active ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="text-right">
                  <AdminListRowActions
                    editHref={`/admin/categories/${c.id}/edit`}
                    previewHref={`/collections/all?category=${c.slug}`}
                    apiUrl={`/api/admin/categories/${c.id}`}
                    enabled={c.active}
                    flagField="active"
                    deleteConfirmText={`${c.title} kategorisini silmek istediğinize emin misiniz?`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {categories.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">
          Henüz kategori yok. Örn. Giyim › Erkek Giyim ekleyin.
        </p>
      ) : null}
    </div>
  );
}
