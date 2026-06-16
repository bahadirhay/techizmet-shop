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
import { initProductCardGalleries } from "@/lib/mirror-product-card-gallery";
import { useMirrorFrameRouteSync } from "@/hooks/use-mirror-frame-route-sync";
import { useMirrorIframeAutoHeight } from "@/hooks/use-mirror-iframe-auto-height";
import { useMirrorIframeLifecycle } from "@/hooks/use-mirror-iframe-lifecycle";
import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { useCallback, useEffect, useRef, useState } from "react";
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
      initProductCardGalleries(doc);
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
  useMirrorIframeAutoHeight(iframeRef, true, src);
  useMirrorFrameRouteSync(iframeRef, src);

  const frameReady = useMirrorIframeLifecycle(iframeRef, src, runPatch, [patchKey, runPatch]);

  useEffect(() => {
    if (productsPrebuilt || productsVisible || hasInitialPayload) return;
    const t = window.setTimeout(() => setProductsVisible(true), 2000);
    return () => window.clearTimeout(t);
  }, [productsPrebuilt, productsVisible, hasInitialPayload, src, patchKey]);

  return (
    <div className="kn-home-mirror">
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
