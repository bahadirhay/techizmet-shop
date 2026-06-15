"use client";

import { type DependencyList, type RefObject, useEffect } from "react";

/** Tek seferlik ölçüm — ResizeObserver/MutationObserver yok (sürekli kaydırmayı önler). */
const MEASURE_AT_MS = [300, 1000, 2500, 4500] as const;
const MAX_UPDATES = 4;
const MIN_DELTA_PX = 20;

export function useMirrorIframeAutoHeight(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  enabled = true,
  deps: DependencyList = [],
) {
  useEffect(() => {
    if (!enabled) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let cancelled = false;
    let lastApplied = 0;
    let updates = 0;
    const timers = new Set<number>();

    function clearTimers() {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    }

    function measure() {
      if (cancelled || updates >= MAX_UPDATES) return;
      try {
        const frame = iframeRef.current;
        if (!frame) return;
        const doc = frame.contentDocument;
        if (!doc?.body) return;
        const h = Math.max(
          doc.documentElement.scrollHeight,
          doc.body.scrollHeight,
          window.innerHeight,
        );
        if (!Number.isFinite(h) || h <= 0) return;
        const next = Math.ceil(h);
        if (lastApplied > 0 && Math.abs(next - lastApplied) < MIN_DELTA_PX) return;
        lastApplied = next;
        updates += 1;
        frame.style.height = `${next}px`;
      } catch {
        /* same-origin only */
      }
    }

    function schedule() {
      clearTimers();
      for (const ms of MEASURE_AT_MS) {
        const id = window.setTimeout(() => {
          timers.delete(id);
          measure();
        }, ms);
        timers.add(id);
      }
    }

    function onLoad() {
      schedule();
    }

    iframe.addEventListener("load", onLoad);
    schedule();

    return () => {
      cancelled = true;
      clearTimers();
      iframe.removeEventListener("load", onLoad);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller deps + stable iframe ref
  }, [iframeRef, enabled, ...deps]);
}
