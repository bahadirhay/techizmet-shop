import Link from "next/link";
import type { ReactNode } from "react";
import { AdminListRowActions } from "@/components/admin/AdminListRowActions";
import {
  inventoryCommercePages,
  inventorySeoLandingPages,
  inventoryUtilityPages,
  vitrinRouteSet,
  type SitePageInventoryRow,
} from "@/lib/admin/site-pages-inventory";
import { MIRROR_CONTENT_PAGE_SLUGS, VITRIN_PAGES } from "@/lib/mirror-vitrin-pages";
import { LANDING_CONTENT } from "@/lib/seo/landing-content";
import { LANDING_COLLECTION_SLUGS } from "@/lib/seo/search-intent";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";

const mirrorSlugSet = new Set<string>(MIRROR_CONTENT_PAGE_SLUGS);
const landingSlugSet = new Set([
  ...LANDING_COLLECTION_SLUGS,
  ...Object.keys(LANDING_CONTENT),
]);

function PageRow({
  label,
  route,
  adminHref,
  adminLabel = "Düzenle",
  note,
  trailing,
}: {
  label: string;
  route: string;
  adminHref?: string;
  adminLabel?: string;
  note?: string;
  trailing?: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-zinc-500">{route}</p>
        {note ? <p className="mt-0.5 text-xs text-zinc-400">{note}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {trailing}
        <a
          href={route}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          Vitrin ↗
        </a>
        {adminHref ? (
          <Link href={adminHref} className="text-sm font-medium text-[var(--kn-brand)]">
            {adminLabel}
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function InventorySection({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: SitePageInventoryRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>
      <ul className="mt-4 divide-y rounded-xl border bg-white">
        {rows.map((row) => (
          <PageRow
            key={row.key}
            label={row.label}
            route={row.route}
            adminHref={row.adminHref}
            note={row.note}
            adminLabel={row.adminHref?.includes("search-intent") ? "Hedef Aramalar" : "Düzenle"}
          />
        ))}
      </ul>
    </section>
  );
}

export default async function PagesListPage() {
  const auth = await requireStaffPage();
  const [pages, collections, categories, blogPosts, productCount] = await Promise.all([
    prisma.shopPage.findMany({
      where: { siteId: auth.siteId },
      orderBy: { slug: "asc" },
    }),
    prisma.storeCollection.findMany({
      where: { siteId: auth.siteId },
      select: { id: true, slug: true, title: true, published: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.storeCategory.findMany({
      where: { siteId: auth.siteId },
      select: { id: true, slug: true, title: true, active: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.storeBlogPost.findMany({
      where: { siteId: auth.siteId },
      select: { id: true, slug: true, titleTr: true, published: true },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    }),
    prisma.storeProduct.count({ where: { siteId: auth.siteId } }),
  ]);

  const cmsOnly = pages.filter((p) => p.slug !== "home" && !mirrorSlugSet.has(p.slug));
  const vitrinRoutes = vitrinRouteSet();
  const seoLandings = inventorySeoLandingPages().filter((r) => !vitrinRoutes.has(r.route));

  const collectionRows: SitePageInventoryRow[] = collections
    .filter((c) => c.slug !== "all" && !landingSlugSet.has(c.slug))
    .map((c) => ({
      key: `collection:${c.id}`,
      label: c.title,
      route: `/collections/${c.slug}`,
      adminHref: `/admin/collections/${c.id}/edit`,
      note: c.published ? undefined : "Pasif",
    }));

  const categoryRows: SitePageInventoryRow[] = categories.map((c) => ({
    key: `category:${c.id}`,
    label: c.title,
    route: `/collections/all?category=${encodeURIComponent(c.slug)}`,
      adminHref: `/admin/categories/${c.id}/edit`,
    note: c.active ? "Kategori filtresi" : "Pasif kategori",
  }));

  const blogRows: SitePageInventoryRow[] = blogPosts.map((p) => ({
    key: `blog:${p.id}`,
    label: p.titleTr,
    route: `/blogs/news/${p.slug}`,
    adminHref: `/admin/blog/${p.id}/edit`,
    note: p.published ? undefined : "Taslak",
  }));

  const commerceRows = inventoryCommercePages().filter((r) => !vitrinRoutes.has(r.route));
  const utilityRows = inventoryUtilityPages().filter((r) => !vitrinRoutes.has(r.route));

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
        Sitedeki tüm genel sayfalar burada listelenir. Mirror vitrin sayfaları bölüm
        editöründen; SEO landing’ler{" "}
        <Link href="/admin/settings/search-intent" className="font-medium underline">
          Hedef Aramalar
        </Link>
        ; logo/meta{" "}
        <Link href="/admin/settings/seo" className="font-medium underline">
          Ayarlar → Logo, favicon & SEO
        </Link>
        .
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900">Vitrin sayfaları (canlı sitedeki içerik)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Ana sayfa, koleksiyonlar, blog listesi, hakkımızda, iletişim, SSS ve politika sayfaları —
          bölüm düzenleme + widget ekleme. Ana sayfadaki blog kartları:{" "}
          <Link href="/admin/blog" className="font-medium underline">
            Blog yazıları
          </Link>
          .
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
                <Link
                  href={`${p.adminPath}?tab=widgets`}
                  className="text-sm text-zinc-600 hover:text-zinc-900"
                >
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

      <InventorySection
        title="SEO landing sayfaları"
        description="Arama niyeti / hammadde hub sayfaları — /collections/... altında yayınlanır."
        rows={seoLandings}
      />

      <InventorySection
        title="Koleksiyonlar"
        description="Veritabanındaki koleksiyon sayfaları (SEO landing slug’ları yukarıda)."
        rows={collectionRows}
      />

      <InventorySection
        title="Kategoriler"
        description="Ürün kategorileri — Tüm ürünler sayfasında filtre olarak açılır."
        rows={categoryRows}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">Özel CMS sayfaları (blok editörü)</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Sözleşme, kampanya vb. — /pages/... adresli sayfalar. Hakkımızda / İletişim / SSS yukarıdaki
          vitrin listesindedir.
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

      <InventorySection
        title="Blog yazıları"
        description="Her yazı ayrı bir /blogs/news/... sayfasıdır. Yönetim: Blog menüsü."
        rows={blogRows}
      />

      <InventorySection
        title="Alışveriş & hesap sayfaları"
        description="Sepet, ödeme, hesap ve arama — tema kabuğu sayfaları."
        rows={commerceRows}
      />

      <InventorySection
        title="Yardımcı sayfalar"
        description="Abonelikten çıkış, bakım ve şifre sıfırlama."
        rows={utilityRows}
      />

      <section className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Ürün sayfaları</p>
        <p className="mt-1">
          Sitede {productCount} ürün sayfası var (
          <code className="rounded bg-white px-1 text-xs">/products/&#123;slug&#125;</code>
          ). Bunlar Sayfalar yerine{" "}
          <Link href="/admin/products" className="font-medium text-[var(--kn-brand)] underline">
            Ürünler
          </Link>{" "}
          sekmesinden yönetilir.
        </p>
      </section>
    </div>
  );
}
