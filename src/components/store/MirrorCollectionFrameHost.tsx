"use client";

import { Suspense, use, useEffect, useState } from "react";
import { MirrorCollectionFrameClient } from "@/components/store/MirrorCollectionFrameClient";
import type { CollectionFramePayload } from "@/lib/mirror-collection-frame-server";
import type { ShopLocale } from "@/lib/i18n/locale";

function CollectionFrameInner({
  src,
  title,
  locale,
  currentPage,
  payload,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  currentPage: number;
  payload: CollectionFramePayload | null;
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
      productsFromAdmin={payload?.productsFromAdmin}
      categoriesFromAdmin={payload?.categoriesFromAdmin}
      activeCategorySlug={payload?.activeCategorySlug}
      mirrorTexts={payload?.mirrorTexts}
      currentPage={currentPage}
      paginationBasePath={payload?.paginationBasePath ?? "/collections/all"}
    />
  );
}

function PayloadFromPromise({
  promise,
  onReady,
}: {
  promise: Promise<CollectionFramePayload>;
  onReady: (value: CollectionFramePayload) => void;
}) {
  const data = use(promise);
  useEffect(() => {
    onReady(data);
  }, [data, onReady]);
  return null;
}

/** Iframe anında; koleksiyon verisi arka planda (sunucu veya JSON API) */
export function MirrorCollectionFrameHost({
  src,
  title,
  locale,
  currentPage,
  payloadPromise,
  fetchPayloadUrl,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  currentPage: number;
  payloadPromise?: Promise<CollectionFramePayload>;
  fetchPayloadUrl?: string;
}) {
  const [payload, setPayload] = useState<CollectionFramePayload | null>(null);

  useEffect(() => {
    if (!fetchPayloadUrl || payloadPromise) return;
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
  }, [fetchPayloadUrl, payloadPromise]);

  return (
    <>
      <CollectionFrameInner
        src={src}
        title={title}
        locale={locale}
        currentPage={currentPage}
        payload={payload}
      />
      {payloadPromise ? (
        <Suspense fallback={null}>
          <PayloadFromPromise promise={payloadPromise} onReady={setPayload} />
        </Suspense>
      ) : null}
    </>
  );
}
