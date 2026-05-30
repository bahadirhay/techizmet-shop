"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ShopLocale } from "@/lib/i18n/locale";

/** iframe içindeki dil düğmeleri → üst sayfa çerezi + yenile */
export function useMirrorLocaleMessage() {
  const router = useRouter();

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
      }).then(() => router.refresh());
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);
}
