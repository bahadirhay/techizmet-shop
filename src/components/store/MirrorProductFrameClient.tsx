"use client";

import { useMirrorFrameRouteSync } from "@/hooks/use-mirror-frame-route-sync";
import { applyMirrorIframeHeight } from "@/lib/mirror-iframe-height";
import { useMirrorIframeAutoHeight } from "@/hooks/use-mirror-iframe-auto-height";
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
import { applyMirrorScrollStability } from "@/lib/mirror-scroll-stability";
import { applyMirrorStoreUiFixToDocument } from "@/lib/mirror-store-ui-fix";
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
import {
  applyProductStarBadge,
  applyProductReviewsAccordion,
  type IframeReviewStats,
  type IframeReviewItem,
} from "@/lib/mirror-product-reviews-inject";

const PATCH_RETRY_MS = [50, 200, 500] as const;

function isPrebuiltMirrorSrc(src: string): boolean {
  return src.includes("/_mirror-prebuilt/");
}

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
  reviewStats,
  reviews = [],
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
  reviewStats?: IframeReviewStats;
  reviews?: IframeReviewItem[];
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cancelBrandingRef = useRef<(() => void) | undefined>(undefined);
  const [contentVisible, setContentVisible] = useState(() => isPrebuiltMirrorSrc(src));
  const [exploreLooks, setExploreLooks] = useState<ProductExploreLook[]>(exploreLooksInitial ?? []);
  const [exploreProductsBySlug, setExploreProductsBySlug] = useState<
    Record<string, ExploreOverlayProduct>
  >(exploreProductsInitial ?? {});
  const [exploreResolved, setExploreResolved] = useState(explorePrefetched);
  const [pageBottomLive, setPageBottomLive] = useState<ProductPageBottomSettings | undefined>(
    productPageBottom,
  );

  useMirrorLocaleMessage();
  // Ürün sayfasında parent route'u iframe location'ından senkronlamak güvenli değil.
  useMirrorFrameRouteSync(iframeRef, src, false);

  // preload kaldırıldı — iframe src ile double-load yapıyordu (+1 gereksiz HTTP request)

  useEffect(() => {
    setContentVisible(isPrebuiltMirrorSrc(src));
  }, [src]);

  // Tek API isteği — pageBottom + exploreLooks birlikte alınır (önceden 2 ayrı fetch vardı)
  useEffect(() => {
    if (!productSlug) return;
    let cancelled = false;
    fetch(`/api/vitrin/product-frame?slug=${encodeURIComponent(productSlug)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            pageBottom?: ProductPageBottomSettings;
            exploreLooks?: ProductExploreLook[];
            exploreProductsBySlug?: Record<string, ExploreOverlayProduct>;
          } | null,
        ) => {
          if (cancelled) return;
          if (data?.pageBottom) setPageBottomLive(data.pageBottom);
          if (!explorePrefetched) {
            setExploreLooks(data?.exploreLooks ?? []);
            setExploreProductsBySlug(data?.exploreProductsBySlug ?? {});
          }
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
    reviewStats,
  });

  useMirrorIframeAutoHeight(iframeRef, false, src); // Ürün sayfasında: useProductFrameHeight ile yönetilir

  const runPatch = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc?.getElementById("MainContent")) return;

    applyMirrorScrollStability(doc);
    applyMirrorIframeHeight(frame);
    applyMirrorStoreUiFixToDocument(doc);
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
        if (productGalleryReady(target, productFromAdmin)) return;
        const outer = target.querySelector("#MainContent .main--product-image-slider-outer");
        const host = outer?.closest("swiper-content") as (HTMLElement & { _initial_run?: () => void }) | null;
        host?._initial_run?.();
        applyProductPatch(target);
      };
      applyProductPatch();
      if (!productGalleryReady(doc, productFromAdmin)) {
        reinitThemeGallery();
        for (const ms of PATCH_RETRY_MS) {
          window.setTimeout(() => {
            const d = iframeRef.current?.contentDocument;
            if (!d?.getElementById("MainContent")) return;
            if (productGalleryReady(d, productFromAdmin)) return;
            reinitThemeGallery(d);
          }, ms);
        }
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
    if (reviewStats) {
      // Yıldız bandı: erken enjekte et (share butonu konumlanınca yerleşir)
      applyProductStarBadge(doc, reviewStats);
      for (const ms of PATCH_RETRY_MS) {
        window.setTimeout(() => {
          const d = iframeRef.current?.contentDocument;
          if (d?.getElementById("MainContent") && reviewStats)
            applyProductStarBadge(d, reviewStats);
        }, ms);
      }
      // Accordion: overlay içerikleri (Öne Çıkan, Nasıl Kullanılır) yerleştikten sonra enjekte et
      const capturedStats = reviewStats;
      const capturedReviews = reviews;
      for (const ms of [1500, 2500, 4000]) {
        window.setTimeout(() => {
          const d = iframeRef.current?.contentDocument;
          if (d?.getElementById("MainContent"))
            applyProductReviewsAccordion(d, capturedStats, capturedReviews);
        }, ms);
      }
    }
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
    reviewStats,
    reviews,
  ]);

  useMirrorIframeLifecycle(iframeRef, src, runPatch, [patchKey, runPatch, src]);

  useEffect(() => {
    const t = window.setTimeout(() => setContentVisible(true), 700);
    return () => window.clearTimeout(t);
  }, [patchKey, src]);

  // Ürün sayfası: iframe içerik yüksekliğini ölçüp CSS değişkenine yaz
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const iframe = iframeRef.current;
    const wrap = wrapRef.current;
    if (!iframe || !wrap) return;

    function measure() {
      try {
        const doc = iframe?.contentDocument;
        const h = doc?.documentElement?.scrollHeight ?? doc?.body?.scrollHeight ?? 0;
        if (h > 200) {
          wrap?.style.setProperty("--product-frame-h", `${h}px`);
          if (iframe) iframe.style.height = `${h}px`;
        }
      } catch {
        // cross-origin guard
      }
    }

    // iframe içinden yorum formu submit mesajını dinle → /api/store/reviews'e post et
    function onMessage(e: MessageEvent) {
      if (e.data?.type !== "kn-submit-review") return;
      const data = e.data.data as {
        rating: number;
        authorName: string;
        title?: string;
        body: string;
        productId?: string;
      };
      const pid = productFromAdmin?.productId ?? iframe?.contentDocument?.documentElement?.getAttribute("data-kn-product-id") ?? "";
      fetch("/api/store/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, productId: pid }),
      })
        .then((r) => r.json())
        .then((res: { ok: boolean; error?: string }) => {
          try {
            const doc = iframe?.contentDocument;
            const msg = doc?.getElementById("kn-review-form-msg");
            if (!msg) return;
            if (res.ok) {
              msg.textContent = "Yorumunuz alındı, onaylandıktan sonra yayınlanacak.";
              msg.style.color = "#166534";
              msg.style.display = "block";
              const form = doc?.getElementById("kn-iframe-review-form") as HTMLFormElement | null;
              form?.reset();
            } else {
              msg.textContent = res.error ?? "Bir hata oluştu, lütfen tekrar deneyin.";
              msg.style.color = "#dc2626";
              msg.style.display = "block";
            }
          } catch { /* cross-origin guard */ }
        })
        .catch(() => { /* network error */ });
    }
    window.addEventListener("message", onMessage);

    iframe.addEventListener("load", measure);
    const timers = [500, 1200, 2500, 4000].map((ms) =>
      window.setTimeout(measure, ms)
    );
    return () => {
      iframe.removeEventListener("load", measure);
      window.removeEventListener("message", onMessage);
      timers.forEach(window.clearTimeout);
    };
  }, [src, productSlug, productFromAdmin]);

  return (
    <div ref={wrapRef} className="kn-home-mirror kn-home-mirror--product relative w-full">
      <iframe
        ref={iframeRef}
        title={title}
        src={src}
        className="mirror-home-frame"
        loading="eager"
      />
    </div>
  );
}
