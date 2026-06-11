"use client";

import type { MirrorPageConfig, MirrorPageSection } from "@/lib/mirror-home-overlay";
import {
  injectMirrorAdminPreviewLayout,
  scrollMirrorSectionIntoView,
} from "@/lib/mirror-admin-preview-layout";
import { mergeScrollingCollectionEdits, applyScrollingCollectionsToSection } from "@/lib/mirror-scrolling-collections-section";
import { mergeTrendingProductEdits, applyTrendingProductsToSection } from "@/lib/mirror-trending-products-section";
import { mergeTestimonialEdits, applyTestimonialToSection } from "@/lib/mirror-testimonial-section";
import { applyMirrorAccountDashboardClient } from "@/lib/mirror-account-dashboard-client";
import { hydrateMirrorAccountPanel } from "@/lib/mirror-account-panel-client";
import {
  applyMirrorAccountDrawerClient,
  openAccountDrawer,
  type AccountDrawerForm,
} from "@/lib/mirror-account-drawer-client";
import { applyMirrorLogoUnify } from "@/lib/mirror-logo-unify";
import { setMirrorFavicon } from "@/lib/mirror-branding-overlay";
import { scheduleMirrorFramePatches, isMirrorServerReady } from "@/lib/mirror-frame-patch";
import { applyMirrorHeaderIconsFix } from "@/lib/mirror-header-overlay";
import { applyMirrorStoreUiFixToDocument } from "@/lib/mirror-store-ui-fix";
import { ensureMirrorLayoutStyles } from "@/lib/mirror-nav-dropdown-inject";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import {
  applyMirrorPageOverlay,
  applyMirrorSectionOrderToDocument,
} from "@/lib/mirror-home-overlay";
import { applySiteMarqueeOverlay } from "@/lib/product-page-bottom";
import type { ProductPageBottomSettings } from "@/lib/product-page-bottom";
import { shouldApplyMirrorPageOverlay } from "@/lib/mirror-has-page-edits";
import {
  applyCollectionsCardsFromAdmin,
  applyCollectionCategoryFiltersFromAdmin,
  type VitrinCollectionCategoryOption,
  type VitrinCollectionCard,
} from "@/lib/mirror-collections-sync";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";
import { stampMirrorEditableElements, hasMarqueeElementOverride } from "@/lib/mirror-element-edits";
import { applyMirrorUsdPrices } from "@/lib/mirror-usd-price-overlay";
import {
  applyCatalogPricesToDocument,
  readCatalogPriceMapFromDocument,
} from "@/lib/mirror-listing-prices";
import {
  applyLiveStoreCatalogToDocument,
  fetchLiveStoreCatalog,
} from "@/lib/mirror-live-catalog-client";

function vitrinOverridesMarquee(config: MirrorPageConfig | undefined): boolean {
  if (!config) return false;
  if (hasMarqueeElementOverride(config.elements)) return true;
  return Object.values(config.sections ?? {}).some((section) => Boolean(section?.marqueeHtml?.trim()));
}
import {
  MIRROR_VISUAL_EDITOR_SCRIPT,
  MIRROR_VISUAL_EDITOR_VERSION,
} from "@/lib/mirror-visual-editor-script";
import { applyCollectionCardEditShields, disableMirrorNavigation } from "@/lib/mirror-visual-edit-dom";
import { useMirrorFrameRouteSync } from "@/hooks/use-mirror-frame-route-sync";
import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function defer(fn: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(fn, { timeout: 800 });
  }
  return window.setTimeout(fn, 50);
}

export function MirrorVitrinFrameClient({
  src,
  title,
  pageConfig,
  branding,
  nav,
  footer,
  locale,
  visualEditMode = false,
  collectionsFromAdmin,
  categoriesFromAdmin,
  mirrorTexts,
  siteMarquee,
  sectionCatalog,
  focusSectionKey,
  usdRate,
}: {
  src: string;
  title: string;
  pageConfig?: MirrorPageConfig;
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
  visualEditMode?: boolean;
  collectionsFromAdmin?: VitrinCollectionCard[];
  categoriesFromAdmin?: VitrinCollectionCategoryOption[];
  mirrorTexts?: ResolvedMirrorCollectionTexts;
  siteMarquee?: ProductPageBottomSettings["marquee"];
  sectionCatalog?: MirrorPageSection[];
  focusSectionKey?: string | null;
  usdRate?: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const baseSrcRef = useRef(src);
  const overlayKeyRef = useRef("");
  const [frameReady, setFrameReady] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accountRaw = searchParams.get("account");
  const accountDrawerForm: AccountDrawerForm | undefined =
    accountRaw === "create" || accountRaw === "login" || accountRaw === "reset"
      ? accountRaw
      : undefined;

  const overlaySig = JSON.stringify(pageConfig ?? null);
  const orderSig = pageConfig?.order?.join("\0") ?? "";
  const pageConfigRef = useRef(pageConfig);
  pageConfigRef.current = pageConfig;
  const isCartOrCheckoutShell =
    pathname === "/cart" || pathname === "/checkout" || pathname.startsWith("/checkout/");

  useMirrorLocaleMessage();
  // Sepet/ödeme shell'lerinde iframe içinde sayfa geçişi olmaz — parent URL değişmemeli
  const syncParentRoute =
    !visualEditMode && !pathname.startsWith("/admin") && !isCartOrCheckoutShell;
  useMirrorFrameRouteSync(iframeRef, src, syncParentRoute);

  const patchSig = JSON.stringify({
    overlaySig,
    collectionsFromAdmin,
    categoriesFromAdmin,
    mirrorTexts,
    branding,
    nav,
    footer,
    locale,
    siteMarquee,
    visualEditMode,
    src,
    isCartOrCheckoutShell,
    usdRate,
  });

  const liveCatalogGenRef = useRef(0);

  useEffect(() => {
    baseSrcRef.current = src;
    setContentVisible(false);
    liveCatalogGenRef.current += 1;
  }, [src]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const config = pageConfig;
    const expectedPath = new URL(src, window.location.origin).pathname;
    let cancelBranding: (() => void) | undefined;
    let cancelIdle: number | undefined;
    let disposed = false;

    function resetIframeIfNavigatedAway() {
      if (!visualEditMode) return;
      try {
        const frame = iframeRef.current;
        if (!frame) return;
        const path = frame.contentWindow?.location.pathname;
        if (!path || path === "about:blank") return;
        if (path === expectedPath || path.startsWith("/api/vitrin/mirror")) return;
        frame.src = baseSrcRef.current;
      } catch {
        /* ignore */
      }
    }

    function runVisualEditOnly(doc: Document) {
      stampMirrorEditableElements(doc);
      disableMirrorNavigation(doc);
      applyCollectionCardEditShields(doc);
      doc.documentElement.classList.add("kn-visual-edit-mode");
      injectMirrorAdminPreviewLayout(doc);

      if (sectionCatalog?.length) {
        const loc = locale ?? "tr";
        for (const s of sectionCatalog) {
          const el = doc.querySelector(`section[id$="__${s.key}"]`);
          if (!el) continue;
          const edit = config?.sections[s.key];
          if (s.type === "scrolling-collections" && s.scrollingCollectionDefaults?.length) {
            applyScrollingCollectionsToSection(
              el,
              mergeScrollingCollectionEdits(s.scrollingCollectionDefaults, edit?.scrollingCollections),
              loc,
            );
          }
          if (s.type === "trending-products" && s.trendingProductDefaults?.length) {
            applyTrendingProductsToSection(
              el,
              mergeTrendingProductEdits(s.trendingProductDefaults, edit?.trendingProducts),
              loc,
            );
          }
          if (s.type === "testimonial" && s.testimonialDefaults?.length) {
            applyTestimonialToSection(
              el,
              mergeTestimonialEdits(s.testimonialDefaults, edit?.testimonials),
              loc,
              edit?.testimonialVisibleCount,
            );
          }
        }
      }

      const win = iframeRef.current?.contentWindow;
      const scriptOk =
        win?.__knVisualEditorVersion === MIRROR_VISUAL_EDITOR_VERSION &&
        doc.getElementById("kn-visual-editor-script");
      if (!scriptOk) {
        win?.__knVisualEditorCleanup?.();
        doc.getElementById("kn-visual-editor-script")?.remove();
        const s = doc.createElement("script");
        s.id = "kn-visual-editor-script";
        s.textContent = MIRROR_VISUAL_EDITOR_SCRIPT;
        doc.body.appendChild(s);
      }
    }

    function applyEmbeddedCatalogPrices(doc: Document) {
      const map = readCatalogPriceMapFromDocument(doc);
      if (map) applyCatalogPricesToDocument(doc, map);
    }

    function applyPageOverlayToDoc(doc: Document) {
      if (!config) return;
      applyMirrorPageOverlay(doc, config, undefined, locale ?? "tr");
      overlayKeyRef.current = overlaySig;
    }

    async function finishCatalogAndVisibility(doc: Document) {
      const catalogGen = liveCatalogGenRef.current;
      if (!visualEditMode && !isCartOrCheckoutShell) {
        const payload = await fetchLiveStoreCatalog();
        if (disposed || catalogGen !== liveCatalogGenRef.current) return;
        if (payload) {
          applyLiveStoreCatalogToDocument(doc, payload, locale ?? "tr", config, mirrorTexts);
        } else {
          applyEmbeddedCatalogPrices(doc);
        }
      } else {
        applyEmbeddedCatalogPrices(doc);
      }
      if (disposed || catalogGen !== liveCatalogGenRef.current) return;
      if (usdRate && usdRate > 0) applyMirrorUsdPrices(doc, usdRate);
      setContentVisible(true);
    }

    function runPatches() {
      if (disposed) return;
      const frame = iframeRef.current;
      if (!frame) return;
      const doc = frame.contentDocument;
      if (!doc?.getElementById("MainContent")) return;

      setFrameReady(true);

      applyMirrorStoreUiFixToDocument(doc);
      ensureMirrorLayoutStyles(doc);

      if (branding?.logoUrl?.trim()) {
        applyMirrorLogoUnify(doc, branding);
      }

      applyMirrorHeaderIconsFix(doc);
      if (branding?.faviconUrl?.trim()) {
        setMirrorFavicon(doc, branding.faviconUrl);
      }

      const serverReady = isMirrorServerReady(doc);
      const serverOverlay = doc.documentElement.getAttribute("data-kn-overlay-server") === "1";
      const collectionsOnServer =
        doc.documentElement.getAttribute("data-kn-collections-server") === "1";
      const hasWidgets = (config?.customBlocks?.length ?? 0) > 0;
      const mustApplyPageConfig = Boolean(pageConfig && shouldApplyMirrorPageOverlay(pageConfig));
      // Sunucu overlay'i uyguladıysa + widget/koleksiyon yoksa client tekrar uygulamaz
      const serverDidAllWork =
        serverOverlay &&
        serverReady &&
        !hasWidgets &&
        !visualEditMode &&
        !collectionsFromAdmin?.length &&
        !categoriesFromAdmin?.length;
      const skipClientWork =
        isCartOrCheckoutShell ||
        serverDidAllWork ||
        (!mustApplyPageConfig &&
          !hasWidgets &&
          serverReady &&
          doc.documentElement.getAttribute("data-kn-catalog-pruned") === "1" &&
          collectionsOnServer &&
          !visualEditMode &&
          !collectionsFromAdmin?.length &&
          !categoriesFromAdmin?.length &&
          (!config || !shouldApplyMirrorPageOverlay(config) || serverOverlay));

      applyMirrorAccountDrawerClient(doc, locale);
      if (pathname === "/account") {
        void hydrateMirrorAccountPanel(doc);
      } else {
        applyMirrorAccountDashboardClient(doc);
      }
      if (accountDrawerForm) openAccountDrawer(doc, accountDrawerForm);

      if (skipClientWork) {
        void finishCatalogAndVisibility(doc);
        return;
      }

      if (!serverReady) {
        cancelBranding?.();
        cancelBranding = scheduleMirrorFramePatches(() => iframeRef.current?.contentDocument ?? undefined, {
          branding,
          nav,
          footer,
          locale,
          accountDrawerForm,
        });
      }

      // Sunucu zaten overlay uyguladıysa client tekrar uygulamaz (görsel titreme önlenir)
      const needsClientOverlay =
        !visualEditMode &&
        config &&
        shouldApplyMirrorPageOverlay(config) &&
        (hasWidgets || !serverOverlay);

      if (!visualEditMode && needsClientOverlay) {
        applyPageOverlayToDoc(doc);
      }

      if (
        siteMarquee &&
        pathname === "/" &&
        !visualEditMode &&
        !vitrinOverridesMarquee(config ?? undefined)
      ) {
        applySiteMarqueeOverlay(doc, siteMarquee);
      }

      if (collectionsFromAdmin?.length) {
        applyCollectionsCardsFromAdmin(doc, collectionsFromAdmin);
        // Yeni eklenen kartlardaki TRY fiyatları da USD'ye çevir
        if (usdRate && usdRate > 0) applyMirrorUsdPrices(doc, usdRate);
      }
      if (categoriesFromAdmin?.length) {
        applyCollectionCategoryFiltersFromAdmin(doc, categoriesFromAdmin, locale, undefined, mirrorTexts);
      }

      if (visualEditMode) {
        runVisualEditOnly(doc);
        if (config) {
          applyPageOverlayToDoc(doc);
          requestAnimationFrame(() => {
            if (disposed) return;
            const d = iframeRef.current?.contentDocument;
            if (d?.getElementById("MainContent") && config) {
              applyMirrorPageOverlay(d, config, undefined, locale ?? "tr");
            }
          });
        }
      }

      void finishCatalogAndVisibility(doc);
    }

    function schedulePatches() {
      cancelIdle = defer(() => {
        if (!disposed) void runPatches();
      }) as number;
    }

    function onLoad() {
      const hasMain = !!iframeRef.current?.contentDocument?.getElementById("MainContent");
      if (!hasMain) {
        setFrameReady(false);
        return;
      }
      schedulePatches();
    }

    function onIframeNavMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "kn-iframe-navigated") resetIframeIfNavigatedAway();
    }

    function onPageShow(ev: PageTransitionEvent) {
      const doc = iframeRef.current?.contentDocument;
      if (ev.persisted && doc?.getElementById("MainContent")) {
        void runPatches();
        return;
      }
      onLoad();
    }

    function onPopState() {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.getElementById("MainContent")) {
        void runPatches();
        return;
      }
      onLoad();
    }

    iframe.addEventListener("load", onLoad);
    window.addEventListener("message", onIframeNavMessage);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);
    if (iframe.contentDocument?.getElementById("MainContent")) {
      schedulePatches();
    }

    const navPoll = visualEditMode
      ? window.setInterval(() => resetIframeIfNavigatedAway(), 2000)
      : undefined;

    return () => {
      disposed = true;
      cancelBranding?.();
      if (cancelIdle) {
        if (typeof window.cancelIdleCallback === "function") {
          window.cancelIdleCallback(cancelIdle);
        } else {
          window.clearTimeout(cancelIdle);
        }
      }
      iframe.removeEventListener("load", onLoad);
      window.removeEventListener("message", onIframeNavMessage);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState);
      if (navPoll) window.clearInterval(navPoll);
    };
  }, [
    patchSig,
    overlaySig,
    sectionCatalog,
    pageConfig,
    branding,
    nav,
    footer,
    locale,
    visualEditMode,
    collectionsFromAdmin,
    categoriesFromAdmin,
    mirrorTexts,
    src,
    pathname,
  ]);

  useEffect(() => {
    if (!visualEditMode || !orderSig || !frameReady) return;

    const applyOrder = () => {
      const cfg = pageConfigRef.current;
      const doc = iframeRef.current?.contentDocument;
      if (!cfg?.order?.length || !doc?.getElementById("MainContent")) return;
      applyMirrorSectionOrderToDocument(doc, cfg.order);
      applyMirrorPageOverlay(doc, cfg, undefined, locale ?? "tr");
    };

    applyOrder();
    const timers = [80, 250, 600].map((ms) => window.setTimeout(applyOrder, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [orderSig, visualEditMode, frameReady, locale, src]);

  useEffect(() => {
    if (!visualEditMode || !focusSectionKey || !frameReady) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const t = window.setTimeout(() => scrollMirrorSectionIntoView(doc, focusSectionKey), 150);
    return () => window.clearTimeout(t);
  }, [focusSectionKey, visualEditMode, frameReady]);

  return (
    <div
      className="kn-home-mirror relative h-full min-h-[70vh] w-full"
      style={{
        opacity: visualEditMode || contentVisible ? 1 : 0,
        transition: contentVisible ? "opacity 0.12s ease-out" : undefined,
      }}
    >
      {visualEditMode && !frameReady ? (
        <p className="absolute right-2 top-2 z-10 rounded-md bg-zinc-800/95 px-2 py-1 text-xs text-zinc-400">
          Yükleniyor…
        </p>
      ) : null}
      <iframe
        ref={iframeRef}
        title={title}
        src={src}
        loading="eager"
        sandbox={visualEditMode ? "allow-same-origin allow-scripts" : undefined}
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
