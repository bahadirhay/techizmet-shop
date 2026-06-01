"use client";

import { Suspense, use, useEffect, useState } from "react";
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
  collectionsFromAdmin,
  categoriesFromAdmin,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  collectionsFromAdmin?: VitrinCollectionCard[];
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
}) {
  const hydration = useMirrorVitrinHydration();
  return (
    <MirrorVitrinFrameClient
      src={src}
      title={title}
      locale={locale}
      pageConfig={hydration?.pageConfig}
      branding={hydration?.branding}
      mirrorTexts={hydration?.mirrorTexts}
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
  onReady: (value: MirrorVitrinHydration) => void;
}) {
  const data = use(promise);
  useEffect(() => {
    onReady(data);
  }, [data, onReady]);
  return null;
}

/** Iframe hemen başlar; ayarlar arka planda bağlanır */
export function MirrorVitrinFrameHost({
  src,
  title,
  locale,
  hydrationPromise,
  collectionsFromAdmin,
  categoriesFromAdmin,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  hydrationPromise: Promise<MirrorVitrinHydration>;
  collectionsFromAdmin?: VitrinCollectionCard[];
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
}) {
  const [hydration, setHydration] = useState<MirrorVitrinHydration>({});

  return (
    <MirrorVitrinHydrationProvider value={hydration}>
      <MirrorVitrinFrameInner
        src={src}
        title={title}
        locale={locale}
        collectionsFromAdmin={collectionsFromAdmin}
        categoriesFromAdmin={categoriesFromAdmin}
      />
      <Suspense fallback={null}>
        <HydrationFromPromise promise={hydrationPromise} onReady={setHydration} />
      </Suspense>
    </MirrorVitrinHydrationProvider>
  );
}
