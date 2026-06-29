import { MirrorVitrinFrameHost } from "@/components/store/MirrorVitrinFrameHost";
import type { VitrinCollectionCard, VitrinCollectionCategoryOption, VitrinCollectionProductCard } from "@/lib/mirror-collections-sync";
import { loadHomeListingProducts } from "@/lib/mirror-home-products-inject-server";
import { getMirrorVitrinHydration } from "@/lib/mirror-vitrin-data";
import { getVitrinPage, vitrinMirrorFileRel, type VitrinPageKey } from "@/lib/mirror-vitrin-pages";
import { resolveStoreMirrorIframeSrcForRequest } from "@/lib/mirror-prebuilt-resolve-server";
import { hasCustomAnnouncementBarSettings } from "@/lib/mirror-announcement-bar";
import { shouldApplyMirrorPageOverlay } from "@/lib/mirror-has-page-edits";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUsdTryRate } from "@/lib/currency/exchange-rate";
import { getStoreInstagramFeedPosts } from "@/lib/store-instagram-feed";
import type { MirrorContactData } from "@/lib/mirror-contact-overlay";
import { notFound } from "next/navigation";

/** Koleksiyon kartları prebuild’de gömülür; yalnızca kategori filtresi sayfasında canlı DB */

/** Techizmet Shop vitrin — prebuild iframe + sunucu hidrasyonu */
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
  const usdRate =
    locale === "en"
      ? await getEffectiveUsdTryRate(settings.store?.usdMarkupPercent ?? 0)
      : null;
  const pageConfig = getMirrorPageConfig(settings, pageKey);
  const branding = settings.branding ?? {};
  const hasCustomBranding = Boolean(
    branding.logoUrl?.includes("/uploads/") ||
      branding.logoUrl?.includes("/api/media/") ||
      branding.logoUrlLight?.includes("/uploads/") ||
      branding.logoUrlLight?.includes("/api/media/") ||
      branding.faviconUrl?.includes("/uploads/") ||
      branding.faviconUrl?.includes("/api/media/"),
  );
  const fileRel = vitrinMirrorFileRel(pageKey, locale);
  const contactSettings = pageKey === "contact" ? settings.pages?.contact : undefined;
  const contact: MirrorContactData | undefined = contactSettings
    ? {
        mapEmbedUrl: contactSettings.mapEmbedUrl,
        mapPosition: contactSettings.mapPosition,
      }
    : undefined;
  const srcExtra = contactSettings?.mapEmbedUrl
    ? { kn_map: contactSettings.mapEmbedUrl }
    : undefined;
  const src = await resolveStoreMirrorIframeSrcForRequest(fileRel, pageKey, srcExtra, {
    hasCustomBlocks: (pageConfig.customBlocks?.length ?? 0) > 0,
    hasMirrorEdits: shouldApplyMirrorPageOverlay(pageConfig),
    hasCustomBranding,
    hasAnnouncementBarSettings: hasCustomAnnouncementBarSettings(settings),
  });
  const [hydration, nav, footer, instagramPosts, homeProductsFromAdmin] = await Promise.all([
    getMirrorVitrinHydration(site.id, pageKey, locale),
    loadMirrorNavItems(site.id, locale),
    loadMirrorFooterData(site.id, locale),
    pageKey === "home" ? getStoreInstagramFeedPosts(site.id) : Promise.resolve([]),
    // Anasayfa ürünlerini sunucu tarafında çek — client-side fetch gereksiz
    pageKey === "home" ? loadHomeListingProducts(site.id) : Promise.resolve(undefined),
  ]);

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
      usdRate={usdRate ?? undefined}
      hydration={hydration}
      nav={nav}
      footer={footer}
      collectionsFromAdmin={collectionsFromAdmin}
      categoriesFromAdmin={categoriesFromAdmin}
      homeProductsFromAdmin={homeProductsFromAdmin ?? undefined}
      instagramPosts={instagramPosts}
      instagramFeedTitle="Instagram"
      contact={contact}
    />
  );
}
