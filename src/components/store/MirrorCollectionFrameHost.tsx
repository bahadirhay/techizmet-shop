"use client";

import { useState } from "react";
import { MirrorCollectionFrameClient } from "@/components/store/MirrorCollectionFrameClient";
import type { CollectionFramePayload } from "@/lib/mirror-collection-payload-types";
import type { ShopLocale } from "@/lib/i18n/locale";

function CollectionFrameInner({
  src,
  title,
  locale,
  currentPage,
  payload,
  productsPrebuilt,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  currentPage: number;
  payload: CollectionFramePayload | null;
  productsPrebuilt?: boolean;
}) {
  return (
    <MirrorCollectionFrameClient
      src={src}
      title={payload?.title ?? title}
      branding={payload?.branding}
      nav={payload?.nav}
      footer={payload?.footer}
      locale={locale}
      collectionFromAdmin={payload?.collectionFromAdmin}
      productsFromAdmin={productsPrebuilt ? undefined : payload?.productsFromAdmin}
      totalProductCount={payload?.totalProductCount}
      categoriesFromAdmin={productsPrebuilt ? undefined : payload?.categoriesFromAdmin}
      activeCategorySlug={payload?.activeCategorySlug}
      mirrorTexts={payload?.mirrorTexts}
      currentPage={currentPage}
      paginationBasePath={payload?.paginationBasePath ?? "/collections/all"}
      productsPrebuilt={productsPrebuilt}
      hasInitialPayload={Boolean(payload)}
    />
  );
}

export function MirrorCollectionFrameHost({
  src,
  title,
  locale,
  currentPage,
  initialPayload = null,
  productsPrebuilt,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  currentPage: number;
  /** Sunucuda hazırlanmış menü + ürün verisi (ek istek yok) */
  initialPayload?: CollectionFramePayload | null;
  productsPrebuilt?: boolean;
}) {
  const [payload, setPayload] = useState<CollectionFramePayload | null>(initialPayload);

  return (
    <CollectionFrameInner
      src={src}
      title={title}
      locale={locale}
      currentPage={currentPage}
      payload={payload}
      productsPrebuilt={productsPrebuilt}
    />
  );
}
