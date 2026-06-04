"use client";

import { useEffect, useRef } from "react";
import {
  analyticsConsentAllowed,
  readUtmFromLocation,
  sendStoreEvents,
} from "@/lib/analytics/client";

/** Mirror iframe postMessage → page_view / product_view */
export function MirrorAnalyticsBridge() {
  const lastPathRef = useRef<string | null>(null);
  const lastProductRef = useRef<string | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!analyticsConsentAllowed()) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "kn-mirror-analytics" || typeof data.path !== "string") return;

      const path = data.path.split("?")[0];
      if (!path || lastPathRef.current === path) return;
      lastPathRef.current = path;

      const utm = readUtmFromLocation();
      sendStoreEvents([{ type: "page_view", payload: { path } }], utm);

      const productMatch = path.match(/^\/products\/([^/]+)/);
      if (productMatch) {
        const slug = decodeURIComponent(productMatch[1]);
        if (lastProductRef.current !== slug) {
          lastProductRef.current = slug;
          sendStoreEvents([{ type: "product_view", payload: { slug } }], utm);
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}
