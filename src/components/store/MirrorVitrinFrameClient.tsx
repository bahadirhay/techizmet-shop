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
import { applyMirrorFooter, scheduleMirrorFooterPatch, type MirrorFooterData } from "@/lib/mirror-footer-overlay";
import { markMirrorEmbedRoot, revealMirrorImagesInDocument } from "@/lib/mirror-image-reveal";
import { applyMirrorScrollStability } from "@/lib/mirror-scroll-stability";
import { installMirrorStreetFoodBar } from "@/lib/mirror-street-food-bar";
import { installMirrorStreetFoodFundPage } from "@/lib/mirror-street-food-fund-page";
import { syncMirrorNavigation, type MirrorNavItem } from "@/lib/mirror-nav-overlay";
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
  mirrorCatalogAlreadyHydrated,
} from "@/lib/mirror-live-catalog-client";
import { initProductCardGalleries } from "@/lib/mirror-product-card-gallery";
import { applyInstagramFeedToDoc } from "@/lib/mirror-instagram-feed";
import type { InstagramFeedPostDTO } from "@/lib/instagram-feed-card";
import type { MirrorContactData } from "@/lib/mirror-contact-overlay";

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
import { applyMirrorIframeHeight } from "@/lib/mirror-iframe-height";
import { useMirrorIframeAutoHeight } from "@/hooks/use-mirror-iframe-auto-height";
import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function defer(fn: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(fn, { timeout: 800 });
  }
  return window.setTimeout(fn, 50);
}

function isPrebuiltMirrorSrc(src: string): boolean {
  return src.includes("/_mirror-prebuilt/");
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
  instagramPosts,
  instagramFeedTitle,
  contact,
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
  instagramPosts?: InstagramFeedPostDTO[];
  instagramFeedTitle?: string;
  contact?: MirrorContactData;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const baseSrcRef = useRef(src);
  const overlayKeyRef = useRef("");
  const [frameReady, setFrameReady] = useState(false);
  const [contentVisible, setContentVisible] = useState(() => isPrebuiltMirrorSrc(src));
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
    instagramPosts,
    instagramFeedTitle,
    contact,
  });

  useMirrorLocaleMessage();
  useMirrorIframeAutoHeight(iframeRef, !visualEditMode, src);
  // Sepet/ödeme shell'lerinde iframe içinde sayfa geçişi olmaz — parent URL değişmemeli
  const syncParentRoute =
    !visualEditMode && !pathname.startsWith("/admin") && !isCartOrCheckoutShell;
  useMirrorFrameRouteSync(iframeRef, src, syncParentRoute);

  const liveCatalogGenRef = useRef(0);
  const patchesCompleteRef = useRef(false);

  useEffect(() => {
    baseSrcRef.current = src;
    setContentVisible(isPrebuiltMirrorSrc(src));
    liveCatalogGenRef.current += 1;
    patchesCompleteRef.current = false;
  }, [src]);

  useEffect(() => {
    if (contentVisible || visualEditMode) return;
    const t = window.setTimeout(() => setContentVisible(true), 2000);
    return () => window.clearTimeout(t);
  }, [contentVisible, visualEditMode, src]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    patchesCompleteRef.current = false;
    const config = pageConfig;
    const expectedPath = new URL(src, window.location.origin).pathname;
    let cancelBranding: (() => void) | undefined;
    let cancelFooter: (() => void) | undefined;
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
      const catalogHydrated = mirrorCatalogAlreadyHydrated(doc);
      try {
        if (!visualEditMode && !isCartOrCheckoutShell && !catalogHydrated) {
          const payload = await fetchLiveStoreCatalog();
          if (disposed || catalogGen !== liveCatalogGenRef.current) return;
          if (payload) {
            applyLiveStoreCatalogToDocument(doc, payload, locale ?? "tr", config, mirrorTexts);
            initProductCardGalleries(doc);
          } else {
            applyEmbeddedCatalogPrices(doc);
          }
        } else {
          applyEmbeddedCatalogPrices(doc);
        }
        if (disposed || catalogGen !== liveCatalogGenRef.current) return;
        if (usdRate && usdRate > 0) applyMirrorUsdPrices(doc, usdRate);
      } catch (err) {
        console.error("[mirror-vitrin] catalog", err);
        try {
          applyEmbeddedCatalogPrices(doc);
        } catch {
          /* ignore */
        }
      } finally {
        if (!disposed && catalogGen === liveCatalogGenRef.current) {
          initProductCardGalleries(doc);
          applyMirrorIframeHeight(iframeRef.current);
          setContentVisible(true);
        }
      }
    }

    function deferNonCriticalPatches(doc: Document) {
      defer(() => {
        if (disposed) return;
        installMirrorStreetFoodBar(doc);
        installMirrorStreetFoodFundPage(doc);
        if (
          instagramPosts?.length &&
          pathname === "/" &&
          !visualEditMode
        ) {
          applyInstagramFeedToDoc(doc, instagramPosts, instagramFeedTitle);
        }
      });
    }

    function runPatches() {
      if (disposed) return;
      const frame = iframeRef.current;
      if (!frame) return;
      const doc = frame.contentDocument;
      if (!doc?.getElementById("MainContent")) return;

      setFrameReady(true);

      markMirrorEmbedRoot(doc);
      applyMirrorStoreUiFixToDocument(doc);
      ensureMirrorLayoutStyles(doc);
      revealMirrorImagesInDocument(doc);
      applyMirrorScrollStability(doc);
      applyMirrorIframeHeight(frame);

      const serverReady = isMirrorServerReady(doc);
      const catalogHydrated = mirrorCatalogAlreadyHydrated(doc);
      const navOnServer = doc.documentElement.getAttribute("data-kn-nav-server") === "1";
      const footerOnServer = doc.documentElement.getAttribute("data-kn-footer-server") === "1";
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

      if (serverReady && catalogHydrated) {
        deferNonCriticalPatches(doc);
      } else {
        installMirrorStreetFoodBar(doc);
        installMirrorStreetFoodFundPage(doc);
      }
      ensureMirrorLayoutStyles(doc);

      if (branding?.logoUrl?.trim()) {
        applyMirrorLogoUnify(doc, branding);
      }

      applyMirrorHeaderIconsFix(doc);
      if (branding?.faviconUrl?.trim()) {
        setMirrorFavicon(doc, branding.faviconUrl);
      }

      applyMirrorAccountDrawerClient(doc, locale);
      if (pathname === "/account") {
        void hydrateMirrorAccountPanel(doc);
      } else {
        applyMirrorAccountDashboardClient(doc);
      }
      if (accountDrawerForm) openAccountDrawer(doc, accountDrawerForm);

      if (nav?.length && !navOnServer) syncMirrorNavigation(doc, nav, locale ?? "tr");
      if (footer && !footerOnServer) {
        applyMirrorFooter(doc, footer);
        cancelFooter?.();
        cancelFooter = scheduleMirrorFooterPatch(
          () => iframeRef.current?.contentDocument ?? undefined,
          footer,
        );
      }

      if (skipClientWork) {
        initProductCardGalleries(doc);
        if (catalogHydrated) {
          applyEmbeddedCatalogPrices(doc);
          if (usdRate && usdRate > 0) applyMirrorUsdPrices(doc, usdRate);
          setContentVisible(true);
          patchesCompleteRef.current = true;
          applyMirrorIframeHeight(frame);
          return;
        }
        void finishCatalogAndVisibility(doc).finally(() => {
          if (!disposed) {
            patchesCompleteRef.current = true;
            applyMirrorIframeHeight(frame);
          }
        });
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
          contact,
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

      if (
        instagramPosts?.length &&
        pathname === "/" &&
        !visualEditMode &&
        !(serverReady && catalogHydrated)
      ) {
        applyInstagramFeedToDoc(doc, instagramPosts, instagramFeedTitle);
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

      void finishCatalogAndVisibility(doc).finally(() => {
        if (!disposed) patchesCompleteRef.current = true;
      });
      applyMirrorIframeHeight(frame);
    }

    function schedulePatches() {
      const doc = iframeRef.current?.contentDocument;
      if (!doc?.getElementById("MainContent")) return;

      const hydrated = mirrorCatalogAlreadyHydrated(doc);
      const serverReady = isMirrorServerReady(doc);
      if (patchesCompleteRef.current && hydrated && serverReady) return;

      runPatches();

      if (!serverReady || !hydrated) {
        cancelIdle = defer(() => {
          if (!disposed && !patchesCompleteRef.current) runPatches();
        }) as number;
      }
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
      cancelFooter?.();
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
    instagramPosts,
    instagramFeedTitle,
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

  useEffect(() => {
    const mapUrl = contact?.mapEmbedUrl;
    if (!mapUrl) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    function sendMap() {
      try {
        iframe?.contentWindow?.postMessage({ type: "kn-map-url", url: mapUrl }, "*");
      } catch {
        /* cross-origin */
      }
    }
    function onLoad() {
      sendMap();
    }
    iframe.addEventListener("load", onLoad);
    if (iframe.contentDocument?.readyState === "complete") sendMap();
    return () => iframe.removeEventListener("load", onLoad);
  }, [contact?.mapEmbedUrl, src]);

  return (
    <div
      className={`kn-home-mirror relative h-screen w-full overflow-hidden ${
        contentVisible || visualEditMode ? "kn-home-mirror--ready" : "kn-home-mirror--boot"
      }`}
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
        data-kn-map-url={contact?.mapEmbedUrl ?? ""}
      />
    </div>
  );
}
