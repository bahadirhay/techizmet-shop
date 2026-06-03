import { MirrorVitrinFrameHost } from "@/components/store/MirrorVitrinFrameHost";
import type { VitrinCollectionCard, VitrinCollectionCategoryOption } from "@/lib/mirror-collections-sync";
import { getMirrorVitrinHydration } from "@/lib/mirror-vitrin-data";
import { getVitrinPage, vitrinMirrorFileRel, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { resolveStoreMirrorIframeSrc } from "@/lib/mirror-prebuilt-resolve";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

/** Koleksiyon kartları prebuild’de gömülür; yalnızca kategori filtresi sayfasında canlı DB */

/** Techizmet Shop vitrin — iframe anında, DB ayarları paralel */
export async function MirrorVitrinFrame({
  pageKey,
}: {
  pageKey: VitrinPageKey;
  /** @deprecated prebuild kullanır; artık yok sayılır */
  collectionsSync?: boolean;
}) {
  const def = getVitrinPage(pageKey);
  if (!def) notFound();

  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();
  const settings = await getSiteSettings(site.id);
  const pageConfig = getMirrorPageConfig(settings, pageKey);
  const fileRel = vitrinMirrorFileRel(pageKey, locale);
  const src = resolveStoreMirrorIframeSrc(fileRel, pageKey, undefined, {
    hasCustomBlocks: (pageConfig.customBlocks?.length ?? 0) > 0,
  });
  const hydrationPromise = getMirrorVitrinHydration(site.id, pageKey, locale);

  let collectionsFromAdmin: VitrinCollectionCard[] | undefined;
  let categoriesFromAdmin: VitrinCollectionCategoryOption[] | undefined;
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
