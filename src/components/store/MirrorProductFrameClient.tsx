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
  const [exploreLooks, setExploreLooks] = useState<ProductExploreLook[]>(exploreLooksInitial ?? []);
  const [exploreProductsBySlug, setExploreProductsBySlug] = useState<
    Record<string, ExploreOverlayProduct>
  >(exploreProductsInitial ?? {});

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
    if (!productSlug || (exploreLooksInitial?.length ?? 0) > 0) return;
    let cancelled = false;
    fetch(`/api/vitrin/product-frame?slug=${encodeURIComponent(productSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { exploreLooks?: ProductExploreLook[]; exploreProductsBySlug?: Record<string, ExploreOverlayProduct> } | null) => {
        if (cancelled || !data) return;
        setExploreLooks(data.exploreLooks ?? []);
        setExploreProductsBySlug(data.exploreProductsBySlug ?? {});
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [productSlug, exploreLooksInitial?.length]);

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
    productPageBottom,
  });

  const runPatch = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc?.getElementById("MainContent")) return;

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

    cancelBrandingRef.current?.();
    if (branding || nav?.length || footer) {
      cancelBrandingRef.current = scheduleMirrorFramePatches(
        () => iframeRef.current?.contentDocument ?? undefined,
        { branding, nav, footer, locale },
      );
    }

    applyProductContentOverlay(doc, overlay ?? {});
    if (commerce) applyMirrorProductCommerce(doc, commerce);
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
    applyExploreLooksOverlay(doc, exploreLooks, exploreProductsBySlug);
  }, [
    branding,
    commerce,
    exploreLooks,
    exploreProductsBySlug,
    footer,
    locale,
    nav,
    overlay,
    productFromAdmin,
    productPageBottom,
  ]);

  useMirrorIframeLifecycle(iframeRef, src, runPatch, [patchKey, runPatch]);

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
        }}
      />
    </div>
  );
}
