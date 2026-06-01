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
  type VitrinCollectionCategoryOption,
  type VitrinCollectionProductCard,
  type VitrinCollectionDetail,
} from "@/lib/mirror-collections-sync";
import { useMirrorFrameRouteSync } from "@/hooks/use-mirror-frame-route-sync";
import { useMirrorIframeLifecycle } from "@/hooks/use-mirror-iframe-lifecycle";
import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { useCallback, useEffect, useRef } from "react";
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
  categoriesFromAdmin,
  activeCategorySlug,
  mirrorTexts,
  currentPage = 1,
  paginationBasePath = "/collections/all",
}: {
  src: string;
  title: string;
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
  collectionFromAdmin?: VitrinCollectionDetail | null;
  productsFromAdmin?: VitrinCollectionProductCard[];
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
  activeCategorySlug?: string;
  mirrorTexts?: ResolvedMirrorCollectionTexts;
  currentPage?: number;
  paginationBasePath?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
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
  });

  const runPatch = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc?.getElementById("MainContent")) return;

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
    if (productsFromAdmin) {
      applyCollectionProductsFromAdmin(doc, productsFromAdmin, locale, mirrorTexts, {
        currentPage,
        basePath: paginationBasePath,
      });
    }
  }, [
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
  ]);

  useMirrorLocaleMessage();
  useMirrorFrameRouteSync(iframeRef, src);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "document";
    link.href = src;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [src]);

  const frameReady = useMirrorIframeLifecycle(iframeRef, src, runPatch, [patchKey, runPatch]);

  return (
    <div className="kn-home-mirror">
      <iframe
        key={`${src}|${activeCategorySlug ?? ""}|${currentPage}|${productsFromAdmin?.length ?? 0}`}
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
