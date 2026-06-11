"use client";

import { MirrorVitrinFrameClient } from "@/components/store/MirrorVitrinFrameClient";
import {
  MirrorVitrinHydrationProvider,
  useMirrorVitrinHydration,
} from "@/components/store/MirrorVitrinHydrationBridge";
import type { MirrorVitrinHydration } from "@/lib/mirror-vitrin-data";
import type { VitrinCollectionCard, VitrinCollectionCategoryOption } from "@/lib/mirror-collections-sync";
import type { ShopLocale } from "@/lib/i18n/locale";

function MirrorVitrinFrameInner({
  src,
  title,
  locale,
  usdRate,
  collectionsFromAdmin,
  categoriesFromAdmin,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  usdRate?: number;
  collectionsFromAdmin?: VitrinCollectionCard[];
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
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
      mirrorTexts={hydration?.mirrorTexts}
      siteMarquee={hydration?.siteMarquee}
      collectionsFromAdmin={collectionsFromAdmin}
      categoriesFromAdmin={categoriesFromAdmin}
    />
  );
}

export function MirrorVitrinFrameHost({
  src,
  title,
  locale,
  usdRate,
  hydration,
  collectionsFromAdmin,
  categoriesFromAdmin,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  usdRate?: number;
  hydration: MirrorVitrinHydration;
  collectionsFromAdmin?: VitrinCollectionCard[];
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
}) {
  return (
    <MirrorVitrinHydrationProvider value={hydration}>
      <MirrorVitrinFrameInner
        src={src}
        title={title}
        locale={locale}
        usdRate={usdRate}
        collectionsFromAdmin={collectionsFromAdmin}
        categoriesFromAdmin={categoriesFromAdmin}
      />
    </MirrorVitrinHydrationProvider>
  );
}
