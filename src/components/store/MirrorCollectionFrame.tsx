import { MirrorCollectionFrameClient } from "@/components/store/MirrorCollectionFrameClient";
import type {
  VitrinCollectionCategoryOption,
  VitrinCollectionDetail,
  VitrinCollectionProductCard,
} from "@/lib/mirror-collections-sync";
import type { ShopLocale } from "@/lib/i18n/locale";
import { toBrandedMirrorSrc } from "@/lib/mirror-html-branding";
import { resolveMirrorCollectionTemplateSlug } from "@/lib/mirror-html-path";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { getCategoryFilterOptions, getCategoryScopeIds } from "@/lib/store-category-tree";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";

/** HTTrack mirror — koleksiyon detay + Admin → Koleksiyonlar DB */
export async function MirrorCollectionFrame({
  slug,
  locale,
  title,
  categorySlug,
  page = 1,
}: {
  slug: string;
  locale: ShopLocale;
  title?: string;
  categorySlug?: string;
  page?: number;
}) {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const branding = getSiteBranding(settings);
  const mirrorTexts = resolveMirrorCollectionTexts(locale, settings.store?.texts);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);
  const row = categorySlug
    ? await prisma.storeCategory.findFirst({
        where: { siteId: site.id, slug: categorySlug, active: true },
        select: { title: true, description: true, seoDescription: true, imageUrl: true },
      })
    : await prisma.storeCollection.findUnique({
        where: { siteId_slug: { siteId: site.id, slug } },
        select: { title: true, description: true, imageUrl: true },
      });
  const templateSlug = categorySlug
    ? "all"
    : (resolveMirrorCollectionTemplateSlug(slug) ?? slug);
  const categories = await prisma.storeCategory.findMany({
    where: { siteId: site.id, active: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      parentId: true,
    },
  });
  const categoryScopeIds = getCategoryScopeIds(categories, categorySlug);
  const products = await prisma.storeProduct.findMany({
    where: {
      siteId: site.id,
      published: true,
      ...(categorySlug
        ? categoryScopeIds?.length
          ? {
              OR: [
                { categoryId: { in: categoryScopeIds } },
                { categoryLinks: { some: { categoryId: { in: categoryScopeIds } } } },
              ],
            }
          : { category: { is: { slug: categorySlug, active: true } } }
        : slug === "all"
          ? {}
          : { collection: { slug } }),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      priceMinor: true,
      compareAtMinor: true,
      stockQty: true,
      lowStockThreshold: true,
      badgesJson: true,
    },
  });

  const src = toBrandedMirrorSrc(
    locale === "tr"
      ? `theme/techizmet-shop/mirror/collections/${templateSlug}-tr.html`
      : `theme/techizmet-shop/mirror/collections/${templateSlug}.html`,
    categorySlug || slug === "all" ? "collections-all" : undefined,
  );

  const paginationBasePath = categorySlug
    ? `/collections/all?category=${encodeURIComponent(categorySlug)}`
    : slug === "all"
      ? "/collections/all"
      : `/collections/${encodeURIComponent(slug)}`;

  const collectionFromAdmin: VitrinCollectionDetail | null = row
    ? {
        title: row.title,
        description:
          (typeof row.description === "string" && row.description.trim()
            ? row.description
            : "seoDescription" in row && typeof row.seoDescription === "string" && row.seoDescription.trim()
              ? row.seoDescription
              : null),
        imageUrl: "imageUrl" in row && typeof row.imageUrl === "string" ? row.imageUrl : null,
      }
    : slug === "all"
      ? { title: title ?? "Tüm ürünler", description: null, imageUrl: null }
      : null;
  const productsFromAdmin: VitrinCollectionProductCard[] = products;
  const categoriesFromAdmin: VitrinCollectionCategoryOption[] = getCategoryFilterOptions(
    categories,
    categorySlug,
  ).map((category) => ({
    slug: category.slug,
    title: category.title,
  }));

  return (
    <MirrorCollectionFrameClient
      src={src}
      title={row?.title ?? title ?? `Collection — ${slug}`}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
      collectionFromAdmin={collectionFromAdmin}
      productsFromAdmin={productsFromAdmin}
      categoriesFromAdmin={categoriesFromAdmin}
      activeCategorySlug={categorySlug}
      mirrorTexts={mirrorTexts}
      currentPage={page}
      paginationBasePath={paginationBasePath}
    />
  );
}
