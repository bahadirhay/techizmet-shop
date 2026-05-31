"use client";

import { deferMirrorFrameWork } from "@/lib/mirror-frame-patch";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DependencyList, type RefObject } from "react";

const RETRY_DELAYS_MS = [0, 180, 700, 1600] as const;

/** Mirror iframe — load / geri-ileri / bfcache sonrası patch + görünürlük */
export function useMirrorIframeLifecycle(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  src: string,
  runPatch: () => void,
  deps: DependencyList = [],
) {
  const [frameReady, setFrameReady] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parentRouteKey = `${pathname}?${searchParams.toString()}`;
  const srcRef = useRef(src);
  srcRef.current = src;

  const attemptPatch = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc?.getElementById("MainContent")) {
        setFrameReady(false);
        return false;
      }
      runPatch();
      setFrameReady(true);
      return true;
    } catch {
      setFrameReady(false);
      return false;
    }
  }, [iframeRef, runPatch]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let patchToken = 0;
    const timers = new Set<number>();

    function clearTimers() {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    }

    function schedulePatch(hideWhileLoading = true) {
      const token = ++patchToken;
      const hasMain = !!iframeRef.current?.contentDocument?.getElementById("MainContent");
      if (hideWhileLoading && !hasMain) setFrameReady(false);
      clearTimers();

      for (const delay of RETRY_DELAYS_MS) {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          deferMirrorFrameWork(() => {
            if (token !== patchToken) return;
            if (attemptPatch()) {
              clearTimers();
            }
          });
        }, delay);
        timers.add(timer);
      }

      const fallback = window.setTimeout(() => {
        timers.delete(fallback);
        if (token !== patchToken) return;
        if (attemptPatch()) return;
        const doc = iframeRef.current?.contentDocument;
        if (doc?.getElementById("MainContent")) {
          runPatch();
          setFrameReady(true);
          return;
        }
        const frame = iframeRef.current;
        if (!frame) return;
        const base = srcRef.current;
        const bust = `${base}${base.includes("?") ? "&" : "?"}_kn=${Date.now()}`;
        frame.src = bust;
      }, 3200);
      timers.add(fallback);
    }

    function onLoad() {
      schedulePatch();
    }

    function onPageShow(ev: PageTransitionEvent) {
      if (ev.persisted && attemptPatch()) return;
      schedulePatch(!ev.persisted);
    }

    function onPopState() {
      if (attemptPatch()) return;
      schedulePatch(false);
    }

    iframe.addEventListener("load", onLoad);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);
    schedulePatch();

    return () => {
      patchToken += 1;
      clearTimers();
      iframe.removeEventListener("load", onLoad);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller deps + stable iframe ref
  }, [iframeRef, src, attemptPatch, parentRouteKey, ...deps]);

  return frameReady;
}
