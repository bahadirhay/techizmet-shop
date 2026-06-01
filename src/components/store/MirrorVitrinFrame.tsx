import { MirrorVitrinFrameHost } from "@/components/store/MirrorVitrinFrameHost";
import type { VitrinCollectionCard, VitrinCollectionCategoryOption } from "@/lib/mirror-collections-sync";
import { getMirrorVitrinHydration } from "@/lib/mirror-vitrin-data";
import { getVitrinPage, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

/** Techizmet Shop vitrin — iframe anında, DB ayarları paralel */
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
  const locale = await getStoreLocaleFromHeaders();
  const src = def.mirrorPath(locale);
  const hydrationPromise = getMirrorVitrinHydration(site.id, pageKey, locale);

  let collectionsFromAdmin: VitrinCollectionCard[] | undefined;
  let categoriesFromAdmin: VitrinCollectionCategoryOption[] | undefined;
  if (collectionsSync || pageKey === "home") {
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
    <MirrorVitrinFrameHost
      src={src}
      title={def.label}
      locale={locale}
      hydrationPromise={hydrationPromise}
      collectionsFromAdmin={collectionsFromAdmin}
      categoriesFromAdmin={categoriesFromAdmin}
    />
  );
}
