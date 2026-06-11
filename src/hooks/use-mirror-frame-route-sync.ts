"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

function isIgnoredFramePath(pathname: string, expectedMirrorPath: string) {
  return (
    !pathname ||
    pathname === "about:blank" ||
    /(?:^|\/)(?:blank|null|undefined)(?:\/|$)/i.test(pathname) ||
    pathname === expectedMirrorPath ||
    pathname.startsWith("/api/vitrin/mirror") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/theme/") ||
    pathname.startsWith("/uploads/")
  );
}

export function useMirrorFrameRouteSync(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  src: string,
  enabled = true,
) {
  const router = useRouter();
  const lastPushedHrefRef = useRef("");

  useEffect(() => {
    lastPushedHrefRef.current = "";
  }, [src]);

  useEffect(() => {
    if (!enabled) return;

    const expectedMirrorPath = new URL(src, window.location.origin).pathname;

    function pushTopRoute(href: string | null | undefined) {
      if (!href || href === lastPushedHrefRef.current) return false;
      // Eski mirror HTML hesap sayfasını "/" sanıp ana sayfaya atmasın
      if (
        href === "/" &&
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/account")
      ) {
        return false;
      }
      lastPushedHrefRef.current = href;
      router.replace(href);
      return true;
    }

    function onPopState() {
      lastPushedHrefRef.current = "";
    }

    function readFrameHref() {
      try {
        const loc = iframeRef.current?.contentWindow?.location;
        if (!loc) return null;
        if (isIgnoredFramePath(loc.pathname, expectedMirrorPath)) return null;
        return `${loc.pathname}${loc.search}${loc.hash}`;
      } catch {
        return null;
      }
    }

    function syncFromFrameLocation() {
      return pushTopRoute(readFrameHref());
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "kn-iframe-route" && typeof data.href === "string") {
        pushTopRoute(data.href);
        return;
      }
      if (data.type === "kn-iframe-navigated") {
        syncFromFrameLocation();
      }
    }

    window.addEventListener("message", onMessage);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled, iframeRef, router, src]);
}
