"use client";

import { applyMirrorIframeHeight } from "@/lib/mirror-iframe-height";
import { type RefObject, useEffect } from "react";

/** iframe yüksekliği 100vh — içerik iframe içinde kayar */
export function useMirrorIframeAutoHeight(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  enabled = true,
  src?: string,
) {
  useEffect(() => {
    if (!enabled) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    function apply() {
      applyMirrorIframeHeight(iframeRef.current);
    }

    iframe.addEventListener("load", apply);
    apply();
    window.addEventListener("resize", apply);

    return () => {
      iframe.removeEventListener("load", apply);
      window.removeEventListener("resize", apply);
    };
  }, [iframeRef, enabled, src]);
}
