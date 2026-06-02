import Link from "next/link";
import { AdminListRowActions } from "@/components/admin/AdminListRowActions";
import { prisma } from "@/lib/prisma";
import { MIRROR_CONTENT_PAGE_SLUGS, VITRIN_PAGES } from "@/lib/mirror-vitrin-pages";
import { requireStaffPage } from "@/lib/staff-auth";

const mirrorSlugSet = new Set<string>(MIRROR_CONTENT_PAGE_SLUGS);

export default async function PagesListPage() {
  const auth = await requireStaffPage();
  const pages = await prisma.shopPage.findMany({
    where: { siteId: auth.siteId },
    orderBy: { slug: "asc" },
  });

  const cmsOnly = pages.filter((p) => p.slug !== "home" && !mirrorSlugSet.has(p.slug));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Sayfalar</h1>
        <Link
          href="/admin/pages/new"
          className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white"
        >
          + Yeni sayfa
        </Link>
      </div>

      <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <strong>Mirror modu</strong> açıkken vitrinde gördüğünüz sayfalar aşağıdaki{" "}
        <strong>Vitrin sayfaları</strong> editöründen düzenlenir. Logo ve SEO:{" "}
        <Link href="/admin/settings/seo" className="font-medium underline">
          Ayarlar → Logo, favicon & SEO
        </Link>
        .
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">Vitrin sayfaları (canlı sitedeki içerik)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Ana sayfa, koleksiyonlar, blog listesi, hakkımızda, iletişim ve SSS — bölüm düzenleme + widget ekleme (slayt, metin, görsel).
          Ana sayfadaki blog kartları: <Link href="/admin/blog" className="font-medium underline">Blog yazıları</Link>{" "}
          (öne çıkar işareti).
        </p>
        <ul className="mt-4 divide-y rounded-xl border bg-white">
          {VITRIN_PAGES.map((p) => (
            <li key={p.key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium">{p.label}</p>
                <p className="text-sm text-zinc-500">{p.route}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={p.route}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-zinc-500 hover:text-zinc-800"
                >
                  Vitrin ↗
                </a>
                <Link href={`${p.adminPath}?tab=widgets`} className="text-sm text-zinc-600 hover:text-zinc-900">
                  Widget&apos;lar
                </Link>
                <Link href={p.adminPath} className="text-sm font-medium text-[var(--kn-brand)]">
                  Düzenle
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">Özel CMS sayfaları (blok editörü)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Sözleşme, kampanya vb. — /pages/... adresli sayfalar. Hakkımızda / İletişim / SSS yukarıdaki vitrin
          listesindedir.
        </p>
        <ul className="mt-4 divide-y rounded-xl border bg-white">
          {cmsOnly.length === 0 ? (
            <li className="px-4 py-6 text-sm text-zinc-500">
              Henüz özel sayfa yok.{" "}
              <Link href="/admin/pages/new" className="text-[var(--kn-brand)] underline">
                Yeni sayfa ekle
              </Link>
            </li>
          ) : (
            cmsOnly.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-zinc-500">/pages/{p.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.published ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {p.published ? "Aktif" : "Pasif"}
                  </span>
                  <AdminListRowActions
                    editHref={`/admin/pages/${p.id}/edit`}
                    previewHref={`/pages/${p.slug}`}
                    apiUrl={`/api/admin/pages/${p.id}`}
                    enabled={p.published}
                    flagField="published"
                    deleteConfirmText={`${p.title} sayfasını silmek istediğinize emin misiniz?`}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
