"use client";

import { MirrorCollectionFrameClient } from "@/components/store/MirrorCollectionFrameClient";
import type { CollectionFramePayload } from "@/lib/mirror-collection-frame-server";
import type { ShopLocale } from "@/lib/i18n/locale";

function CollectionFrameInner({
  src,
  title,
  locale,
  currentPage,
  payload,
  activeCategorySlug,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  currentPage: number;
  payload: CollectionFramePayload;
  activeCategorySlug?: string;
}) {
  return (
    <MirrorCollectionFrameClient
      src={src}
      title={payload.title ?? title}
      branding={payload.branding}
      nav={payload.nav}
      footer={payload.footer}
      locale={locale}
      collectionFromAdmin={payload.collectionFromAdmin}
      productsFromAdmin={payload.productsFromAdmin}
      categoriesFromAdmin={payload.categoriesFromAdmin}
      activeCategorySlug={activeCategorySlug ?? payload.activeCategorySlug}
      mirrorTexts={payload.mirrorTexts}
      currentPage={currentPage}
      paginationBasePath={payload.paginationBasePath ?? "/collections/all"}
      hideTemplateProductsUntilSync={Boolean(activeCategorySlug ?? payload.activeCategorySlug)}
    />
  );
}

/** Iframe anında; ürün listesi sunucudan gelen payload ile patch (kategori flash yok) */
export function MirrorCollectionFrameHost({
  src,
  title,
  locale,
  currentPage,
  initialPayload,
  activeCategorySlug,
}: {
  src: string;
  title: string;
  locale: ShopLocale;
  currentPage: number;
  initialPayload: CollectionFramePayload;
  activeCategorySlug?: string;
}) {
  return (
    <CollectionFrameInner
      src={src}
      title={title}
      locale={locale}
      currentPage={currentPage}
      payload={initialPayload}
      activeCategorySlug={activeCategorySlug}
    />
  );
}
