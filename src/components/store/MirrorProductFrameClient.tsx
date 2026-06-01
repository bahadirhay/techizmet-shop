"use client";

import { useMirrorFrameRouteSync } from "@/hooks/use-mirror-frame-route-sync";
import { useMirrorIframeLifecycle } from "@/hooks/use-mirror-iframe-lifecycle";
import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyExploreLooksOverlay,
  type ExploreOverlayProduct,
  type ProductExploreLook,
} from "@/lib/product-explore-looks";
import { scheduleMirrorFramePatches } from "@/lib/mirror-frame-patch";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import {
  applyProductDetailFromAdmin,
  patchStickyBuyButton,
  type VitrinProductDetail,
} from "@/lib/mirror-product-detail-sync";
import {
  applyMirrorProductCommerce,
  type MirrorProductCommercePayload,
} from "@/lib/mirror-product-commerce";
import {
  applyProductContentOverlay,
  type ProductContentOverlay,
} from "@/lib/mirror-product-overlay";
import {
  applyProductPageBottomOverlay,
  type ProductPageBottomSettings,
} from "@/lib/product-page-bottom";

const PATCH_RETRY_MS = [50, 200, 500] as const;

function isProductDocSynced(doc: Document) {
  return doc.documentElement.getAttribute("data-kn-product-sync") === "1";
}

export function MirrorProductFrameClient({
  src,
  title,
  overlay,
  productFromAdmin,
  commerce,
  branding,
  nav,
  footer,
  locale,
  exploreLooks: exploreLooksInitial,
  exploreProductsBySlug: exploreProductsInitial,
  productPageBottom,
  productSlug,
}: {
  src: string;
  title: string;
  overlay?: ProductContentOverlay;
  productFromAdmin?: VitrinProductDetail;
  commerce?: MirrorProductCommercePayload;
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
  exploreLooks?: ProductExploreLook[];
  exploreProductsBySlug?: Record<string, ExploreOverlayProduct>;
  productPageBottom?: ProductPageBottomSettings;
  productSlug?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cancelBrandingRef = useRef<(() => void) | undefined>(undefined);
  const [contentVisible, setContentVisible] = useState(false);
  const [exploreLooks, setExploreLooks] = useState<ProductExploreLook[]>(exploreLooksInitial ?? []);
  const [exploreProductsBySlug, setExploreProductsBySlug] = useState<
    Record<string, ExploreOverlayProduct>
  >(exploreProductsInitial ?? {});
  const [exploreResolved, setExploreResolved] = useState(
    (exploreLooksInitial?.length ?? 0) > 0,
  );

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

  useEffect(() => {
    setContentVisible(false);
  }, [src]);

  useEffect(() => {
    if (!productSlug || exploreResolved) return;
    let cancelled = false;
    fetch(`/api/vitrin/product-frame?slug=${encodeURIComponent(productSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { exploreLooks?: ProductExploreLook[]; exploreProductsBySlug?: Record<string, ExploreOverlayProduct> } | null) => {
        if (cancelled) return;
        setExploreLooks(data?.exploreLooks ?? []);
        setExploreProductsBySlug(data?.exploreProductsBySlug ?? {});
        setExploreResolved(true);
      })
      .catch(() => {
        if (!cancelled) setExploreResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [productSlug, exploreResolved]);

  const patchKey = JSON.stringify({
    overlay,
    productFromAdmin,
    commerce,
    branding,
    nav,
    footer,
    locale,
    exploreLooks,
    exploreProductsBySlug,
    exploreResolved,
    productPageBottom,
  });

  const runPatch = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc?.getElementById("MainContent")) return;

    const prebuiltSynced = isProductDocSynced(doc);

    if (!prebuiltSynced) {
      if (productFromAdmin) {
        applyProductDetailFromAdmin(doc, productFromAdmin);
        const stickyProduct = productFromAdmin;
        const reapplySticky = () => {
          const d = iframeRef.current?.contentDocument;
          if (d?.getElementById("MainContent")) patchStickyBuyButton(d, stickyProduct);
        };
        for (const ms of PATCH_RETRY_MS) {
          window.setTimeout(reapplySticky, ms);
        }
      }
      applyProductContentOverlay(doc, overlay ?? {});
      if (commerce) applyMirrorProductCommerce(doc, commerce);
    }

    cancelBrandingRef.current?.();
    if (branding || nav?.length || footer) {
      cancelBrandingRef.current = scheduleMirrorFramePatches(
        () => iframeRef.current?.contentDocument ?? undefined,
        { branding, nav, footer, locale },
      );
    }

    if (productPageBottom) {
      const bottom = productPageBottom;
      const applyBottom = () => {
        const d = iframeRef.current?.contentDocument;
        if (d?.getElementById("MainContent")) applyProductPageBottomOverlay(d, bottom);
      };
      applyBottom();
      for (const ms of PATCH_RETRY_MS) {
        window.setTimeout(applyBottom, ms);
      }
    }
    if (exploreResolved) {
      applyExploreLooksOverlay(doc, exploreLooks, exploreProductsBySlug);
    }

    if (isProductDocSynced(doc) || prebuiltSynced) {
      setContentVisible(true);
    }
  }, [
    branding,
    commerce,
    exploreLooks,
    exploreProductsBySlug,
    exploreResolved,
    footer,
    locale,
    nav,
    overlay,
    productFromAdmin,
    productPageBottom,
  ]);

  useMirrorIframeLifecycle(iframeRef, src, runPatch, [patchKey, runPatch, src]);

  return (
    <div className="kn-home-mirror">
      <iframe
        ref={iframeRef}
        title={title}
        src={src}
        className="mirror-home-frame"
        loading="eager"
        style={{
          display: "block",
          width: "100%",
          minHeight: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
          opacity: contentVisible ? 1 : 0,
          transition: contentVisible ? "opacity 0.12s ease-out" : undefined,
        }}
      />
    </div>
  );
}
