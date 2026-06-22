"use client";

import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import {
  MirrorVitrinHydrationProvider,
  useMirrorVitrinHydration,
} from "@/components/store/MirrorVitrinHydrationBridge";
import type { MirrorVitrinHydration } from "@/lib/mirror-vitrin-data";
import type { VitrinCollectionCard, VitrinCollectionCategoryOption } from "@/lib/mirror-collections-sync";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import type { InstagramFeedPostDTO } from "@/lib/instagram-feed-card";
import type { MirrorContactData } from "@/lib/mirror-contact-overlay";

function MirrorVitrinFrameInner({
  src,
  title,
  locale,
  usdRate,
  nav,
  footer,
  collectionsFromAdmin,
  categoriesFromAdmin,
  instagramPosts,
  instagramFeedTitle,
  contact,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  usdRate?: number;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  collectionsFromAdmin?: VitrinCollectionCard[];
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
  instagramPosts?: InstagramFeedPostDTO[];
  instagramFeedTitle?: string;
  contact?: MirrorContactData;
}) {
  const hydration = useMirrorVitrinHydration();
  return (
    <MirrorVitrinFrameClient
      src={src}
      title={title}
      locale={locale}
      usdRate={usdRate}
      pageConfig={hydration?.pageConfig}
      branding={hydration?.branding}
      nav={nav}
      footer={footer}
      mirrorTexts={hydration?.mirrorTexts}
      siteMarquee={hydration?.siteMarquee}
      collectionsFromAdmin={collectionsFromAdmin}
      categoriesFromAdmin={categoriesFromAdmin}
      instagramPosts={instagramPosts}
      instagramFeedTitle={instagramFeedTitle}
      contact={contact}
    />
  );
}

export function MirrorVitrinFrameHost({
  src,
  title,
  locale,
  usdRate,
  hydration,
  nav,
  footer,
  collectionsFromAdmin,
  categoriesFromAdmin,
  instagramPosts,
  instagramFeedTitle,
  contact,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  usdRate?: number;
  hydration: MirrorVitrinHydration;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  collectionsFromAdmin?: VitrinCollectionCard[];
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
  instagramPosts?: InstagramFeedPostDTO[];
  instagramFeedTitle?: string;
  contact?: MirrorContactData;
}) {
  return (
    <MirrorVitrinHydrationProvider value={hydration}>
      <MirrorVitrinFrameInner
        src={src}
        title={title}
        locale={locale}
        usdRate={usdRate}
        nav={nav}
        footer={footer}
        collectionsFromAdmin={collectionsFromAdmin}
        categoriesFromAdmin={categoriesFromAdmin}
        instagramPosts={instagramPosts}
        instagramFeedTitle={instagramFeedTitle}
        contact={contact}
      />
    </MirrorVitrinHydrationProvider>
  );
}
