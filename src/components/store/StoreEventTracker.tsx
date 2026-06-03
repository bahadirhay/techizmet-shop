"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  analyticsConsentAllowed,
  readUtmFromLocation,
  sendStoreEvents,
} from "@/lib/analytics/client";

export function StoreEventTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);
  const lastPageRef = useRef<string | null>(null);
  const lastProductRef = useRef<string | null>(null);

  useEffect(() => {
    setAllowed(analyticsConsentAllowed());
    const onConsent = () => setAllowed(analyticsConsentAllowed());
    window.addEventListener("kn-cookie-consent", onConsent);
    window.addEventListener("storage", onConsent);
    return () => {
      window.removeEventListener("kn-cookie-consent", onConsent);
      window.removeEventListener("storage", onConsent);
    };
  }, []);

  useEffect(() => {
    if (!allowed || !pathname) return;

    const utm = readUtmFromLocation();
    const pageKey = `${pathname}?${searchParams?.toString() ?? ""}`;

    if (lastPageRef.current !== pageKey) {
      lastPageRef.current = pageKey;
      sendStoreEvents([{ type: "page_view", payload: { path: pathname } }], utm);
    }

    const productMatch = pathname.match(/^\/products\/([^/?#]+)/);
    if (productMatch) {
      const slug = decodeURIComponent(productMatch[1]);
      if (lastProductRef.current !== slug) {
        lastProductRef.current = slug;
        sendStoreEvents([{ type: "product_view", payload: { slug } }], utm);
      }
    }
  }, [allowed, pathname, searchParams]);

  return null;
}
