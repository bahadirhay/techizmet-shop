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
import {
  applyMirrorAccountDrawerClient,
  openAccountDrawer,
  type AccountDrawerForm,
} from "@/lib/mirror-account-drawer-client";
import { scheduleMirrorFramePatches, isMirrorServerReady } from "@/lib/mirror-frame-patch";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import { applyMirrorPageOverlay } from "@/lib/mirror-home-overlay";
import { hasMirrorPageEdits } from "@/lib/mirror-has-page-edits";
import {
  applyCollectionsCardsFromAdmin,
  applyCollectionCategoryFiltersFromAdmin,
  type VitrinCollectionCategoryOption,
  type VitrinCollectionCard,
} from "@/lib/mirror-collections-sync";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";
import { stampMirrorEditableElements } from "@/lib/mirror-element-edits";
import {
  MIRROR_VISUAL_EDITOR_SCRIPT,
  MIRROR_VISUAL_EDITOR_VERSION,
} from "@/lib/mirror-visual-editor-script";
import { applyCollectionCardEditShields, disableMirrorNavigation } from "@/lib/mirror-visual-edit-dom";
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
  sectionCatalog,
  focusSectionKey,
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
  sectionCatalog?: MirrorPageSection[];
  focusSectionKey?: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const baseSrcRef = useRef(src);
  const overlayKeyRef = useRef("");
  const [frameReady, setFrameReady] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parentRouteKey = `${pathname}?${searchParams.toString()}`;
  const accountRaw = searchParams.get("account");
  const accountDrawerForm: AccountDrawerForm | undefined =
    accountRaw === "create" || accountRaw === "login" || accountRaw === "reset"
      ? accountRaw
      : undefined;

  const overlaySig = JSON.stringify(pageConfig ?? null);
  const patchSig = JSON.stringify({
    overlaySig,
    collectionsFromAdmin,
    categoriesFromAdmin,
    mirrorTexts,
    branding,
    nav,
    footer,
    locale,
    visualEditMode,
    src,
  });

  useMirrorLocaleMessage();

  useEffect(() => {
    baseSrcRef.current = src;
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

    function runPatches() {
      if (disposed) return;
      const frame = iframeRef.current;
      if (!frame) return;
      const doc = frame.contentDocument;
      if (!doc?.getElementById("MainContent")) return;

      setFrameReady(true);

      const serverReady = isMirrorServerReady(doc);
      const serverOverlay = doc.documentElement.getAttribute("data-kn-overlay-server") === "1";
      const collectionsOnServer =
        doc.documentElement.getAttribute("data-kn-collections-server") === "1";
      const hasWidgets = (config?.customBlocks?.length ?? 0) > 0;
      const mustApplyPageConfig = Boolean(pageConfig && hasMirrorPageEdits(pageConfig));
      const skipClientWork =
        !mustApplyPageConfig &&
        !hasWidgets &&
        serverReady &&
        doc.documentElement.getAttribute("data-kn-catalog-pruned") === "1" &&
        collectionsOnServer &&
        !visualEditMode &&
        !collectionsFromAdmin?.length &&
        !categoriesFromAdmin?.length &&
        (!config || !hasMirrorPageEdits(config) || serverOverlay);

      applyMirrorAccountDrawerClient(doc);
      applyMirrorAccountDashboardClient(doc);
      if (accountDrawerForm) openAccountDrawer(doc, accountDrawerForm);

      if (skipClientWork) return;

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

      const needsClientOverlay =
        config &&
        hasMirrorPageEdits(config) &&
        (hasWidgets ||
          pageConfig != null ||
          !serverOverlay ||
          (visualEditMode && overlaySig !== overlayKeyRef.current));

      if (needsClientOverlay) {
        applyMirrorPageOverlay(doc, config, undefined, locale ?? "tr");
        overlayKeyRef.current = overlaySig;
      }

      if (collectionsFromAdmin?.length) {
        applyCollectionsCardsFromAdmin(doc, collectionsFromAdmin);
      }
      if (categoriesFromAdmin?.length) {
        applyCollectionCategoryFiltersFromAdmin(doc, categoriesFromAdmin, locale, undefined, mirrorTexts);
      }

      if (visualEditMode) {
        runVisualEditOnly(doc);
      }
    }

    function schedulePatches() {
      cancelIdle = defer(() => {
        if (!disposed) runPatches();
      }) as number;
    }

    function onLoad() {
      const hasMain = !!iframeRef.current?.contentDocument?.getElementById("MainContent");
      if (!hasMain) setFrameReady(false);
      overlayKeyRef.current = "";
      schedulePatches();
    }

    function onIframeNavMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "kn-iframe-navigated") resetIframeIfNavigatedAway();
    }

    function onPageShow(ev: PageTransitionEvent) {
      const doc = iframeRef.current?.contentDocument;
      if (ev.persisted && doc?.getElementById("MainContent")) {
        runPatches();
        return;
      }
      onLoad();
    }

    function onPopState() {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.getElementById("MainContent")) {
        runPatches();
        return;
      }
      onLoad();
    }

    iframe.addEventListener("load", onLoad);
    window.addEventListener("message", onIframeNavMessage);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);
    onLoad();

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
    parentRouteKey,
  ]);

  useEffect(() => {
    if (!visualEditMode || !focusSectionKey || !frameReady) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const t = window.setTimeout(() => scrollMirrorSectionIntoView(doc, focusSectionKey), 150);
    return () => window.clearTimeout(t);
  }, [focusSectionKey, visualEditMode, frameReady]);

  return (
    <div className="kn-home-mirror relative h-full min-h-[70vh] w-full">
      {visualEditMode && !frameReady ? (
        <p className="absolute right-2 top-2 z-10 rounded-md bg-zinc-800/95 px-2 py-1 text-xs text-zinc-400">
          Yükleniyor…
        </p>
      ) : null}
      <iframe
        key={src}
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
