"use client";

import { useEffect } from "react";
import type { ShopLocale } from "@/lib/i18n/locale";

/** iframe içindeki dil düğmeleri → üst sayfa çerezi + tam yenileme */
export function useMirrorLocaleMessage() {
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.type !== "kn-set-locale") return;
      const locale = data.locale as ShopLocale;
      if (locale !== "tr" && locale !== "en") return;
      void fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
        credentials: "same-origin",
      }).then(() => {
        window.location.replace(
          `${window.location.pathname}${window.location.search}${window.location.hash}`,
        );
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}
