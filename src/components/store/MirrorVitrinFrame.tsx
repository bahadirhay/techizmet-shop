import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import type { VitrinCollectionCard, VitrinCollectionCategoryOption } from "@/lib/mirror-collections-sync";
import { listFeaturedBlogPostsForHome } from "@/lib/blog/blog-posts-server";
import { mergeFeaturedBlogIntoPageConfig } from "@/lib/mirror-featured-blog";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { getVitrinPage, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { getStoreLocale } from "@/lib/i18n/server";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";

/** Techizmet Shop vitrin sayfası — admin ayarları + koleksiyon DB */
export async function MirrorVitrinFrame({
  pageKey,
  collectionsSync = false,
}: {
  pageKey: VitrinPageKey;
  collectionsSync?: boolean;
}) {
  const def = getVitrinPage(pageKey);
  if (!def) notFound();

  const site = await getDefaultSite();
  const locale = await getStoreLocale();
  const settings = await getSiteSettings(site.id);
  let pageConfig = getMirrorPageConfig(settings, pageKey);
  if (pageKey === "home") {
    const featured = await listFeaturedBlogPostsForHome(site.id, locale);
    if (featured.length) pageConfig = mergeFeaturedBlogIntoPageConfig(pageConfig, featured);
  }
  const branding = getSiteBranding(settings);
  const mirrorTexts = resolveMirrorCollectionTexts(locale, settings.store?.texts);
  const nav = await loadMirrorNavItems(site.id, locale);
  const footer = await loadMirrorFooterData(site.id, locale);
  const src = def.mirrorPath(locale);

  let collectionsFromAdmin: VitrinCollectionCard[] | undefined;
  let categoriesFromAdmin: VitrinCollectionCategoryOption[] | undefined;
  if (collectionsSync) {
    const rows = await prisma.storeCollection.findMany({
      where: { siteId: site.id, published: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { slug: true, title: true, description: true, imageUrl: true, sortOrder: true },
    });
    collectionsFromAdmin = rows;
  }
  if (pageKey === "collections-all") {
    const rows = await prisma.storeCategory.findMany({
      where: { siteId: site.id, parentId: null, active: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { slug: true, title: true },
    });
    categoriesFromAdmin = rows;
  }

  return (
    <MirrorVitrinFrameClient
      src={src}
      title={def.label}
      pageConfig={pageConfig}
      branding={branding}
      nav={nav}
      footer={footer}
      locale={locale}
      collectionsFromAdmin={collectionsFromAdmin}
      categoriesFromAdmin={categoriesFromAdmin}
      mirrorTexts={mirrorTexts}
    />
  );
}
