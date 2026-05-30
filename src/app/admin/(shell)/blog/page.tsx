import Link from "next/link";
import { AdminListRowActions } from "@/components/admin/AdminListRowActions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { btnPrimary } from "@/components/admin/AdminForm";
import { blogPostHref } from "@/lib/blog/blog-post-types";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function AdminBlogListPage() {
  const auth = await requireStaffPage();
  const posts = await prisma.storeBlogPost.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Blog yazıları" }]}
        title="Blog yazıları"
        description="Haber / blog içerikleri — vitrinde /blogs/news altında yayınlanır. Ana sayfa kartları buradan yönetilir."
        actions={
          <Link href="/admin/blog/new" className={btnPrimary}>
            + Yeni yazı
          </Link>
        }
      />

      <ul className="mt-6 divide-y rounded-xl border bg-white">
        {posts.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-zinc-500">
            Henüz yazı yok.{" "}
            <Link href="/admin/blog/new" className="text-[var(--kn-brand)] underline">
              İlk yazıyı ekle
            </Link>{" "}
            veya terminalde{" "}
            <code className="rounded bg-zinc-100 px-1">npm run blog:import-mirror</code> çalıştırın.
          </li>
        ) : (
          posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{p.titleTr}</p>
                <p className="text-sm text-zinc-500">{blogPostHref(p.slug)}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {p.published ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      Yayında
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                      Taslak
                    </span>
                  )}
                  {p.featuredOnHome ? (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-800">
                      Ana sayfa
                    </span>
                  ) : null}
                </div>
              </div>
              <AdminListRowActions
                editHref={`/admin/blog/${p.id}/edit`}
                previewHref={p.published ? blogPostHref(p.slug) : undefined}
                apiUrl={`/api/admin/blog/${p.id}`}
                enabled={p.published}
                flagField="published"
                deleteConfirmText={`"${p.titleTr}" yazısını silmek istediğinize emin misiniz?`}
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
