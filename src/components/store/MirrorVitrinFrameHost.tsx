"use client";

import { Suspense, use, useCallback, useEffect, useState, type SetStateAction } from "react";
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

function HydrationFromPromise({
  promise,
  onReady,
}: {
  promise: Promise<MirrorVitrinHydration>;
  onReady: (value: SetStateAction<MirrorVitrinHydration>) => void;
}) {
  const data = use(promise);
  useEffect(() => {
    onReady((prev) => (hydrationSig(prev) === hydrationSig(data) ? prev : data));
  }, [data, onReady]);
  return null;
}

/** Iframe hemen başlar; ayarlar arka planda bağlanır */
function hydrationSig(data: MirrorVitrinHydration): string {
  return JSON.stringify(data);
}

export function MirrorVitrinFrameHost({
  src,
  title,
  locale,
  usdRate,
  hydrationPromise,
  initialHydration,
  collectionsFromAdmin,
  categoriesFromAdmin,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  usdRate?: number;
  hydrationPromise: Promise<MirrorVitrinHydration>;
  initialHydration?: MirrorVitrinHydration;
  collectionsFromAdmin?: VitrinCollectionCard[];
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
}) {
  const [hydration, setHydration] = useState<MirrorVitrinHydration>(initialHydration ?? {});
  const onHydrationReady = useCallback((value: SetStateAction<MirrorVitrinHydration>) => {
    setHydration(value);
  }, []);

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
      <Suspense fallback={null}>
        <HydrationFromPromise promise={hydrationPromise} onReady={onHydrationReady} />
      </Suspense>
    </MirrorVitrinHydrationProvider>
  );
}
