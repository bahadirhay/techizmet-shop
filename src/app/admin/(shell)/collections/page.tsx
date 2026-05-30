import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CollectionRowActions } from "@/components/admin/CollectionRowActions";
import { btnPrimary } from "@/components/admin/AdminForm";
import { loadCollectionProductCounts } from "@/lib/collection-product-count";
import { getMirrorCollectionImage } from "@/lib/mirror-collection-images";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function CollectionsPage() {
  const auth = await requireStaffPage();
  const collections = await prisma.storeCollection.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const productCounts = await loadCollectionProductCounts(
    auth.siteId,
    collections.map((c) => c.slug),
  );

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ürünler", href: "/admin/products" }, { label: "Koleksiyonlar" }]}
        title="Koleksiyonlar"
        description="Kart başlık/görsel: buradan. Sayfa tasarımı ve banner metinleri: Sayfalar → Koleksiyonlar → Düzenle (tıkla-düzenle)."
        actions={
          <>
            <Link
              href="/admin/pages/vitrin/collections"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Sayfayı düzenle
            </Link>
            <a
              href="/collections"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Vitrin ↗
            </a>
            <Link href="/admin/collections/new" className={btnPrimary}>
              + Yeni koleksiyon
            </Link>
          </>
        }
      />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Koleksiyon</th>
              <th>Slug</th>
              <th>Açıklama</th>
              <th>Ürün</th>
              <th>Durum</th>
              <th>Sıra</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c) => {
              const thumb = c.imageUrl ?? getMirrorCollectionImage(c.slug);
              const productCount = productCounts.get(c.slug) ?? 0;
              return (
                <tr key={c.id} className={!c.published ? "bg-zinc-50/80" : undefined}>
                  <td>
                    <div className="flex items-center gap-3">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-zinc-100" />
                      )}
                      <span className={`font-medium ${!c.published ? "text-zinc-500" : ""}`}>{c.title}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-zinc-500">/{c.slug}</td>
                  <td className="max-w-xs truncate text-sm text-zinc-600" title={c.description ?? ""}>
                    {c.description?.trim() ? c.description : "—"}
                  </td>
                  <td className="font-medium tabular-nums">{productCount}</td>
                  <td>
                    {c.published ? (
                      <span className="text-xs font-medium text-emerald-700">Aktif</span>
                    ) : (
                      <span className="text-xs font-medium text-amber-700">Pasif</span>
                    )}
                  </td>
                  <td>{c.sortOrder}</td>
                  <td>
                    <CollectionRowActions id={c.id} slug={c.slug} published={c.published} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {collections.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">Henüz koleksiyon yok.</p>
      ) : null}
    </div>
  );
}
