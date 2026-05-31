"use client";

import { useMirrorLocaleMessage } from "@/hooks/use-mirror-locale-message";
import { useEffect, useRef, useState } from "react";
import { deferMirrorFrameWork, scheduleMirrorFramePatches } from "@/lib/mirror-frame-patch";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";

export function MirrorPageFrameClient({
  src,
  title,
  branding,
  nav,
  footer,
  locale,
}: {
  src: string;
  title: string;
  branding?: MirrorBranding;
  nav?: MirrorNavItem[];
  footer?: MirrorFooterData;
  locale?: ShopLocale;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const patchKey = JSON.stringify({ branding, nav, footer, locale });

  useMirrorLocaleMessage();

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
