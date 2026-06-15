"use client";

import { useMirrorIframeAutoHeight } from "@/hooks/use-mirror-iframe-auto-height";
import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { useEffect, useRef, useState } from "react";
import { deferMirrorFrameWork, scheduleMirrorFramePatches } from "@/lib/mirror-frame-patch";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import type { MirrorContactData } from "@/lib/mirror-contact-overlay";

export function MirrorPageFrameClient({
  src,
  title,
  branding,
  nav,
  footer,
  locale,
  contact,
}: {
  src: string;
  title: string;
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
  contact?: MirrorContactData;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const patchKey = JSON.stringify({ branding, nav, footer, locale, contact });

  useMirrorLocaleMessage();
  useMirrorIframeAutoHeight(iframeRef, true, [src, patchKey]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelBrandingSchedule: (() => void) | undefined;
    let patchToken = 0;

    function runPatch() {
      try {
        const frame = iframeRef.current;
        if (!frame) return;
        const doc = frame.contentDocument;
        if (!doc?.getElementById("MainContent")) return;
        cancelBrandingSchedule?.();
        cancelBrandingSchedule = scheduleMirrorFramePatches(() => iframeRef.current?.contentDocument ?? undefined, {
          branding,
          nav,
          footer,
          locale,
          contact,
        });
        setFrameReady(true);
      } catch {
        /* same-origin */
      }
    }

    function patch() {
      const token = ++patchToken;
      setFrameReady(false);
      deferMirrorFrameWork(() => {
        if (token !== patchToken) return;
        runPatch();
      });
    }

    iframe.addEventListener("load", patch);
    patch();
    return () => {
      patchToken += 1;
      cancelBrandingSchedule?.();
      iframe.removeEventListener("load", patch);
    };
  }, [patchKey, branding, nav, src]);

  // postMessage yedek — query param zaten URL'i taşısa da bu ekstra güvence sağlar
  useEffect(() => {
    const mapUrl = contact?.mapEmbedUrl;
    if (!mapUrl) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    function sendMap() {
      try {
        iframe?.contentWindow?.postMessage({ type: "kn-map-url", url: mapUrl }, "*");
      } catch {}
    }
    // load sonrası gönder (query param ile zaten yüklü olsa da)
    function onLoad() { sendMap(); }
    iframe.addEventListener("load", onLoad);
    // Sayfa zaten yüklüyse hemen gönder
    if (iframe.contentDocument?.readyState === "complete") sendMap();
    return () => iframe.removeEventListener("load", onLoad);
  }, [contact?.mapEmbedUrl, src]);

  return (
    <div className="kn-home-mirror">
      <iframe
        ref={iframeRef}
        title={title}
        src={src}
        className="mirror-home-frame"
        // data-kn-map-url: aynı origin olduğu için DOMContentLoaded'da da okunabilir
        data-kn-map-url={contact?.mapEmbedUrl ?? ""}
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
