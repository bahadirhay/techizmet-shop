"use client";

import type { MirrorHomeConfig } from "@/lib/mirror-home-overlay";
import { applyMirrorHomeOverlay } from "@/lib/mirror-home-overlay";
import { deferMirrorFrameWork, scheduleMirrorFramePatches } from "@/lib/mirror-frame-patch";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import { stampMirrorEditableElements } from "@/lib/mirror-element-edits";
import { applyCollectionCardEditShields, disableMirrorNavigation } from "@/lib/mirror-visual-edit-dom";
import {
  MIRROR_VISUAL_EDITOR_SCRIPT,
  MIRROR_VISUAL_EDITOR_VERSION,
} from "@/lib/mirror-visual-editor-script";
import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { useEffect, useRef, useState } from "react";

export function MirrorHomeFrameClient({
  src,
  title,
  homeConfig,
  branding,
  nav,
  footer,
  locale,
  visualEditMode = false,
}: {
  src: string;
  title: string;
  homeConfig?: MirrorHomeConfig;
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
  visualEditMode?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const baseSrcRef = useRef(src);
  const [frameReady, setFrameReady] = useState(false);
  const configKey = JSON.stringify({ homeConfig, branding, nav, footer, locale });

  useMirrorLocaleMessage();

  useEffect(() => {
    baseSrcRef.current = src;
  }, [src]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const config = homeConfig;
    const expectedPath = new URL(src, window.location.origin).pathname;

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

    let cancelBrandingSchedule: (() => void) | undefined;
    let patchToken = 0;
    const patchTimers = new Set<number>();

    function runPatch() {
      try {
        const frame = iframeRef.current;
        if (!frame) return;
        resetIframeIfNavigatedAway();
        const doc = frame.contentDocument;
        if (!doc?.getElementById("MainContent")) return;

        cancelBrandingSchedule?.();
        cancelBrandingSchedule = scheduleMirrorFramePatches(() => iframeRef.current?.contentDocument ?? undefined, {
          branding,
          nav,
          footer,
          locale,
        });

        if (config) applyMirrorHomeOverlay(doc, config, locale ?? "tr");
        if (visualEditMode) {
          stampMirrorEditableElements(doc);
          disableMirrorNavigation(doc);
          applyCollectionCardEditShields(doc);
          doc.documentElement.classList.add("kn-visual-edit-mode");
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
        setFrameReady(true);
      } catch {
        /* same-origin only */
      }
    }

    function patch() {
      const token = ++patchToken;
      setFrameReady(false);
      const scheduleAttempt = (delay: number) => {
        const timer = window.setTimeout(() => {
          patchTimers.delete(timer);
          deferMirrorFrameWork(() => {
            if (token !== patchToken) return;
            runPatch();
          });
        }, delay);
        patchTimers.add(timer);
      };

      scheduleAttempt(0);
      scheduleAttempt(180);
      scheduleAttempt(700);
      scheduleAttempt(1600);
    }

    function onIframeNavMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "kn-iframe-navigated") resetIframeIfNavigatedAway();
    }

    iframe.addEventListener("load", patch);
    window.addEventListener("message", onIframeNavMessage);
    patch();

    const navPoll = visualEditMode
      ? window.setInterval(() => resetIframeIfNavigatedAway(), 400)
      : undefined;

    return () => {
      patchToken += 1;
      cancelBrandingSchedule?.();
      patchTimers.forEach((timer) => window.clearTimeout(timer));
      patchTimers.clear();
      iframe.removeEventListener("load", patch);
      window.removeEventListener("message", onIframeNavMessage);
      if (navPoll) window.clearInterval(navPoll);
    };
  }, [configKey, src, homeConfig, branding, nav, footer, locale, visualEditMode]);

  return (
    <div className="kn-home-mirror relative">
      {visualEditMode ? (
        <p className="absolute left-4 top-2 z-10 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          Metin alanına tıklayın — tüm linkler kapalı. Kaydetmeden vitrin değişmez.
        </p>
      ) : null}
      <iframe
        ref={iframeRef}
        title={title}
        src={src}
        sandbox={visualEditMode ? "allow-same-origin allow-scripts" : undefined}
        className="mirror-home-frame"
        style={{
          display: "block",
          width: "100%",
          minHeight: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
          visibility: frameReady ? "visible" : "hidden",
          opacity: frameReady ? 1 : 0,
          pointerEvents: frameReady ? "auto" : "none",
        }}
      />
    </div>
  );
}
