"use client";

import { scheduleMirrorFramePatches } from "@/lib/mirror-frame-patch";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import {
  applyCollectionDetailFromAdmin,
  applyCollectionProductsFromAdmin,
  type VitrinCollectionProductCard,
} from "@/lib/mirror-collections-sync";
import { applySearchPageLayout } from "@/lib/mirror-search-page";
import { useMirrorFrameRouteSync } from "@/hooks/use-mirror-frame-route-sync";
import { useMirrorIframeAutoHeight } from "@/hooks/use-mirror-iframe-auto-height";
import { useMirrorIframeLifecycle } from "@/hooks/use-mirror-iframe-lifecycle";
import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { useCallback, useRef } from "react";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";

export function MirrorSearchFrameClient({
  src,
  title,
  searchTerm,
  branding,
  nav,
  footer,
  locale,
  pageTitle,
  pageDescription,
  productsFromAdmin,
  mirrorTexts,
}: {
  src: string;
  title: string;
  searchTerm: string;
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
  pageTitle: string;
  pageDescription: string;
  productsFromAdmin: VitrinCollectionProductCard[];
  mirrorTexts?: ResolvedMirrorCollectionTexts;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cancelBrandingRef = useRef<(() => void) | undefined>(undefined);

  const patchKey = JSON.stringify({
    searchTerm,
    pageTitle,
    pageDescription,
    productsFromAdmin,
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

    cancelBrandingRef.current?.();
    cancelBrandingRef.current = scheduleMirrorFramePatches(() => iframeRef.current?.contentDocument ?? undefined, {
      branding,
      nav,
      footer,
      locale,
    });

    applyCollectionDetailFromAdmin(doc, {
      title: pageTitle,
      description: pageDescription,
    });

    const term = searchTerm.trim();
    if (term.length >= 2) {
      applyCollectionProductsFromAdmin(doc, productsFromAdmin, locale, mirrorTexts);
    }

    applySearchPageLayout(doc, {
      term,
      locale,
      resultCount: productsFromAdmin.length,
    });
  }, [
    branding,
    footer,
    locale,
    mirrorTexts,
    nav,
    pageDescription,
    pageTitle,
    productsFromAdmin,
    searchTerm,
  ]);

  useMirrorLocaleMessage();
  useMirrorIframeAutoHeight(iframeRef, true, src);
  useMirrorFrameRouteSync(iframeRef, src);
  const frameReady = useMirrorIframeLifecycle(iframeRef, src, runPatch, [patchKey, runPatch]);

  return (
    <div className="kn-home-mirror">
      <iframe
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
