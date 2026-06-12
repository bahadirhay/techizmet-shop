"use client";

import { useMirrorFrameRouteSync } from "@/hooks/use-mirror-frame-route-sync";
import { useMirrorIframeLifecycle } from "@/hooks/use-mirror-iframe-lifecycle";
import { injectMirrorProductBreadcrumb } from "@/lib/mirror-product-breadcrumb";
import { stripSeoFromMirrorDocument } from "@/lib/mirror-html-seo-strip";
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
  productGalleryReady,
  type VitrinProductDetail,
} from "@/lib/mirror-product-detail-sync";
import {
  applyMirrorProductCommerce,
  type MirrorProductCommercePayload,
} from "@/lib/mirror-product-commerce";
import { applyMirrorProductShare } from "@/lib/mirror-product-share";
import type { ProductSharePayload } from "@/lib/product-share";
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
  explorePrefetched = false,
  productPageBottom,
  productSlug,
  templateMirrorSlug,
  share,
  breadcrumbs = [],
}: {
  src: string;
  title: string;
  overlay?: ProductContentOverlay;
  productFromAdmin?: VitrinProductDetail;
  commerce?: MirrorProductCommercePayload;
  share?: ProductSharePayload;
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
  exploreLooks?: ProductExploreLook[];
  exploreProductsBySlug?: Record<string, ExploreOverlayProduct>;
  /** SSR'den Keşfet verisi geldiyse istemci fetch beklemeden gizleme uygulanır */
  explorePrefetched?: boolean;
  productPageBottom?: ProductPageBottomSettings;
  productSlug?: string;
  templateMirrorSlug?: string;
  breadcrumbs?: { name: string; href: string; current?: boolean }[];
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cancelBrandingRef = useRef<(() => void) | undefined>(undefined);
  const [contentVisible, setContentVisible] = useState(false);
  const [exploreLooks, setExploreLooks] = useState<ProductExploreLook[]>(exploreLooksInitial ?? []);
  const [exploreProductsBySlug, setExploreProductsBySlug] = useState<
    Record<string, ExploreOverlayProduct>
  >(exploreProductsInitial ?? {});
  const [exploreResolved, setExploreResolved] = useState(explorePrefetched);
  const [pageBottomLive, setPageBottomLive] = useState<ProductPageBottomSettings | undefined>(
    productPageBottom,
  );

  useMirrorLocaleMessage();
  // PDP iframe icindeki tema galerisi eski Shopify ürün URL'lerine gidebiliyor.
  // Ürün sayfasında parent route'u iframe location'ından senkronlamak güvenli değil.
  useMirrorFrameRouteSync(iframeRef, src, false);

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
    if (!productSlug) return;
    let cancelled = false;
    fetch(`/api/vitrin/product-frame?slug=${encodeURIComponent(productSlug)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { pageBottom?: ProductPageBottomSettings } | null) => {
        if (cancelled || !data?.pageBottom) return;
        setPageBottomLive(data.pageBottom);
      })
      .catch(() => {
        /* SSR props yedek */
      });
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  useEffect(() => {
    if (!productSlug || explorePrefetched) return;
    let cancelled = false;
    fetch(`/api/vitrin/product-frame?slug=${encodeURIComponent(productSlug)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            exploreLooks?: ProductExploreLook[];
            exploreProductsBySlug?: Record<string, ExploreOverlayProduct>;
          } | null,
        ) => {
          if (cancelled) return;
          setExploreLooks(data?.exploreLooks ?? []);
          setExploreProductsBySlug(data?.exploreProductsBySlug ?? {});
          setExploreResolved(true);
        },
      )
      .catch(() => {
        if (!cancelled) setExploreResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [productSlug, explorePrefetched]);

  useEffect(() => {
    setPageBottomLive(productPageBottom);
  }, [productPageBottom]);

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
    pageBottomLive,
    share,
  });

  const runPatch = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc?.getElementById("MainContent")) return;

    stripSeoFromMirrorDocument(doc);
    if (breadcrumbs.length) {
      injectMirrorProductBreadcrumb(doc, breadcrumbs, locale ?? "tr");
    }

    const prebuiltSynced = isProductDocSynced(doc);

    if (productFromAdmin) {
      const applyProductPatch = (target = doc) => {
        applyProductDetailFromAdmin(target, productFromAdmin, {
          templateSlug: templateMirrorSlug,
        });
      };
      const reinitThemeGallery = (target = doc) => {
        const outer = target.querySelector("#MainContent .main--product-image-slider-outer");
        const host = outer?.closest("swiper-content") as (HTMLElement & { _initial_run?: () => void }) | null;
        host?._initial_run?.();
        applyProductPatch(target);
      };
      applyProductPatch();
      reinitThemeGallery();
      for (const ms of PATCH_RETRY_MS) {
        window.setTimeout(() => {
          const d = iframeRef.current?.contentDocument;
          if (!d?.getElementById("MainContent")) return;
          reinitThemeGallery(d);
        }, ms);
      }
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

    const sharePayload = share ?? commerce?.share;
    if (sharePayload && !doc.getElementById("kn-share-btn")) {
      applyMirrorProductShare(doc, sharePayload);
      for (const ms of PATCH_RETRY_MS) {
        window.setTimeout(() => {
          const d = iframeRef.current?.contentDocument;
          if (d?.getElementById("MainContent") && !d.getElementById("kn-share-btn")) {
            applyMirrorProductShare(d, sharePayload);
          }
        }, ms);
      }
    }

    cancelBrandingRef.current?.();
    if (branding || nav?.length || footer) {
      cancelBrandingRef.current = scheduleMirrorFramePatches(
        () => iframeRef.current?.contentDocument ?? undefined,
        { branding, nav, footer, locale },
      );
    }

    if (pageBottomLive) {
      const bottom = pageBottomLive;
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

    const galleryReady = productGalleryReady(doc, productFromAdmin);
    const bottomReady = !productSlug || Boolean(pageBottomLive);
    const exploreReady = !productSlug || exploreResolved;
    if (
      (isProductDocSynced(doc) || prebuiltSynced || pageBottomLive) &&
      galleryReady &&
      bottomReady &&
      exploreReady
    ) {
      setContentVisible(true);
    }
  }, [
    branding,
    commerce,
    exploreLooks,
    exploreProductsBySlug,
    explorePrefetched,
    exploreResolved,
    footer,
    locale,
    nav,
    overlay,
    productFromAdmin,
    productSlug,
    templateMirrorSlug,
    pageBottomLive,
    share,
    breadcrumbs,
  ]);

  useMirrorIframeLifecycle(iframeRef, src, runPatch, [patchKey, runPatch, src]);

  useEffect(() => {
    const t = window.setTimeout(() => setContentVisible(true), 1800);
    return () => window.clearTimeout(t);
  }, [patchKey, src]);

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
