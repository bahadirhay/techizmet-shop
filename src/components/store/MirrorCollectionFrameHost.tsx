"use client";

import { useEffect, useState } from "react";
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
      categoriesFromAdmin={productsPrebuilt ? undefined : payload?.categoriesFromAdmin}
      activeCategorySlug={payload?.activeCategorySlug}
      mirrorTexts={payload?.mirrorTexts}
      currentPage={currentPage}
      paginationBasePath={payload?.paginationBasePath ?? "/collections/all"}
      productsPrebuilt={productsPrebuilt}
    />
  );
}

export function MirrorCollectionFrameHost({
  src,
  title,
  locale,
  currentPage,
  fetchPayloadUrl,
  productsPrebuilt,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  currentPage: number;
  fetchPayloadUrl?: string;
  productsPrebuilt?: boolean;
}) {
  const [payload, setPayload] = useState<CollectionFramePayload | null>(null);

  useEffect(() => {
    if (!fetchPayloadUrl || productsPrebuilt) return;
    let cancelled = false;
    fetch(fetchPayloadUrl, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: CollectionFramePayload) => {
        if (!cancelled) setPayload(j);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchPayloadUrl, productsPrebuilt]);

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
