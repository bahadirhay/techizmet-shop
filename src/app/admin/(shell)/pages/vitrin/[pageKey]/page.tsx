import { notFound } from "next/navigation";
import { MirrorVitrinAdminEditor } from "@/components/admin/MirrorVitrinAdminEditor";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { buildEditableCatalogFromHtml, extractSwiperAutoplayMs, sliceSectionHtml } from "@/lib/mirror-editable-catalog";
import { localizeEditableCatalogDefaults } from "@/lib/mirror-editable-catalog-server";
import { loadMirrorPageSectionsCatalog } from "@/lib/mirror-page-sections";
import { readMirrorPageHtml } from "@/lib/mirror-page-html";
import { isVitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getStoreLocale } from "@/lib/i18n/server";
import { requireStaffPage } from "@/lib/staff-auth";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { formatTry } from "@/lib/format";
import { listBlogPostsForAdminEditor } from "@/lib/blog/blog-posts-server";

function stripHtml(html: string | null | undefined) {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function VitrinPageEditRoute({
  params,
  searchParams,
}: {
  params: Promise<{ pageKey: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await requireStaffPage();
  const { pageKey } = await params;
  const { tab } = await searchParams;
  if (!isVitrinPageKey(pageKey)) notFound();

  const site = await getDefaultSite();
  const settings = await getSiteSettings(auth.siteId);
  const branding = getSiteBranding(settings);
  const locale = await getStoreLocale();
  const nav = await loadMirrorNavItems(auth.siteId, locale);
  const footer = await loadMirrorFooterData(auth.siteId, locale);
  const catalog = loadMirrorPageSectionsCatalog(pageKey);
  const initialConfig = getMirrorPageConfig(settings, pageKey);
  const mirrorHtml = readMirrorPageHtml(pageKey);
  const editableCatalog = localizeEditableCatalogDefaults(
    mirrorHtml ? buildEditableCatalogFromHtml(mirrorHtml) : {},
    locale,
  );
  const sectionSwiperMs: Record<string, number | null> = {};
  if (mirrorHtml) {
    for (const s of catalog) {
      const block = sliceSectionHtml(mirrorHtml, s.key);
      if (block) sectionSwiperMs[s.key] = extractSwiperAutoplayMs(block);
    }
  }

  let collectionsFromAdmin;
  const productOptions = await prisma.storeProduct.findMany({
    where: { siteId: site.id, published: true },
    orderBy: [{ title: "asc" }],
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      priceMinor: true,
      description: true,
      descriptionHtml: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });
  const blogPostsForEditor =
    pageKey === "blog-news" || pageKey === "home"
      ? await listBlogPostsForAdminEditor(site.id)
      : undefined;

  if (pageKey === "collections") {
    collectionsFromAdmin = await prisma.storeCollection.findMany({
      where: { siteId: site.id, published: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { slug: true, title: true, description: true, imageUrl: true, sortOrder: true },
    });
  }

  return (
    <MirrorVitrinAdminEditor
      pageKey={pageKey}
      catalog={catalog}
      initialConfig={initialConfig}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
      collectionsFromAdmin={collectionsFromAdmin}
      productOptions={productOptions.map((product) => ({
        slug: product.slug,
        title: product.title,
        imageUrl: product.imageUrl || product.images[0]?.url || null,
        description: product.description?.trim() || stripHtml(product.descriptionHtml),
        priceLabel: formatTry(product.priceMinor),
      }))}
      editableCatalog={editableCatalog}
      sectionSwiperMs={sectionSwiperMs}
      blogPosts={blogPostsForEditor}
      initialEditorMode={tab === "widgets" ? "blocks" : "sections"}
    />
  );
}
