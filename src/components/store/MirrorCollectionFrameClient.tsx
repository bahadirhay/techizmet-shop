"use client";

import { applyMirrorFramePatches } from "@/lib/mirror-frame-patch";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import {
  applyCollectionCategoryFiltersFromAdmin,
  applyCollectionProductsFromAdmin,
  applyCollectionDetailFromAdmin,
  setCollectionProductsAwaiting,
  type VitrinCollectionCategoryOption,
  type VitrinCollectionProductCard,
  type VitrinCollectionDetail,
} from "@/lib/mirror-collections-sync";
import { useMirrorFrameRouteSync } from "@/hooks/use-mirror-frame-route-sync";
import { useMirrorIframeLifecycle } from "@/hooks/use-mirror-iframe-lifecycle";
import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { useCallback, useRef, useState } from "react";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";

export function MirrorCollectionFrameClient({
  src,
  title,
  branding,
  nav,
  footer,
  locale,
  collectionFromAdmin,
  productsFromAdmin,
  totalProductCount,
  categoriesFromAdmin,
  activeCategorySlug,
  mirrorTexts,
  currentPage = 1,
  paginationBasePath = "/collections/all",
  productsPrebuilt = false,
  hasInitialPayload = false,
}: {
  src: string;
  title: string;
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
  collectionFromAdmin?: VitrinCollectionDetail | null;
  productsFromAdmin?: VitrinCollectionProductCard[];
  totalProductCount?: number;
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
  activeCategorySlug?: string;
  mirrorTexts?: ResolvedMirrorCollectionTexts;
  currentPage?: number;
  paginationBasePath?: string;
  /** Ürünler iframe HTML'inde sunucuda — istemci patch yok */
  productsPrebuilt?: boolean;
  hasInitialPayload?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [productsVisible, setProductsVisible] = useState(
    productsPrebuilt || hasInitialPayload,
  );
  const patchKey = JSON.stringify({
    collectionFromAdmin,
    productsFromAdmin,
    categoriesFromAdmin,
    activeCategorySlug,
    currentPage,
    paginationBasePath,
    mirrorTexts,
    branding,
    nav,
    footer,
    locale,
    productsPrebuilt,
  });

  const runPatch = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc?.getElementById("MainContent")) return;

    const needsProductGuard =
      !productsPrebuilt &&
      !hasInitialPayload &&
      (Boolean(activeCategorySlug) || productsFromAdmin !== undefined);
    if (needsProductGuard) {
      setCollectionProductsAwaiting(doc, true);
    }

    applyMirrorFramePatches(doc, {
      branding,
      nav,
      footer,
      locale,
    });

    if (collectionFromAdmin) applyCollectionDetailFromAdmin(doc, collectionFromAdmin);
    if (categoriesFromAdmin?.length) {
      applyCollectionCategoryFiltersFromAdmin(doc, categoriesFromAdmin, locale, activeCategorySlug, mirrorTexts);
    }
    if (productsFromAdmin?.length) {
      applyCollectionProductsFromAdmin(doc, productsFromAdmin, locale, mirrorTexts, {
        currentPage,
        basePath: paginationBasePath,
        totalCount: totalProductCount,
      });
      setProductsVisible(true);
    } else if (
      productsPrebuilt &&
      doc.documentElement.getAttribute("data-kn-collection-catalog") === "1"
    ) {
      setProductsVisible(true);
    } else if (needsProductGuard) {
      setCollectionProductsAwaiting(doc, true);
    }
  }, [
    productsPrebuilt,
    hasInitialPayload,
    activeCategorySlug,
    currentPage,
    paginationBasePath,
    branding,
    categoriesFromAdmin,
    collectionFromAdmin,
    footer,
    locale,
    mirrorTexts,
    nav,
    productsFromAdmin,
    totalProductCount,
  ]);

  useMirrorLocaleMessage();
  useMirrorFrameRouteSync(iframeRef, src);

  const frameReady = useMirrorIframeLifecycle(iframeRef, src, runPatch, [patchKey, runPatch]);

  return (
    <div
      className="kn-home-mirror"
      style={{
        opacity: productsPrebuilt || productsVisible || hasInitialPayload ? 1 : 0,
        transition:
          productsPrebuilt || productsVisible || hasInitialPayload ? "opacity 0.12s ease-out" : "none",
      }}
    >
      <iframe
        key={`${src}|${activeCategorySlug ?? ""}|${currentPage}|${productsFromAdmin?.length ?? 0}|${productsPrebuilt ? "pre" : "patch"}`}
        ref={iframeRef}
        title={title}
        src={src}
        className="mirror-home-frame"
        style={{
          display: "block",
          width: "100%",
          minHeight: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
        }}
      />
    </div>
  );
}
