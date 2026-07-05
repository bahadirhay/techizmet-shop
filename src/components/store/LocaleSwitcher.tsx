"use client";

import { useState } from "react";
import type { ShopLocale } from "@/lib/i18n/locale";
import { LOCALE_COOKIE, isShopLocale } from "@/lib/i18n/locale";

function readLocaleCookie(): ShopLocale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  const raw = m?.[1]?.trim();
  return isShopLocale(raw) ? raw : null;
}

export function LocaleSwitcher({
  locale,
  label,
  trLabel,
  enLabel,
  compact = false,
}: {
  locale: ShopLocale;
  label: string;
  trLabel: string;
  enLabel: string;
  /** Header ikon çubuğu — mirror ile aynı TR/EN pill */
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function setLocale(next: ShopLocale) {
    const current = readLocaleCookie() ?? locale;
    if (next === current || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("locale");
      const target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
    } catch {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      window.location.replace(`${window.location.pathname}${window.location.search}${window.location.hash}`);
    }
  }

  if (compact) {
    return (
      <div className="kn-iframe-locale" aria-label={label}>
        <button
          type="button"
          data-locale="tr"
          className={locale === "tr" ? "is-active" : ""}
          disabled={busy}
          aria-label={trLabel}
          onClick={() => void setLocale("tr")}
        >
          TR
        </button>
        <button
          type="button"
          data-locale="en"
          className={locale === "en" ? "is-active" : ""}
          disabled={busy}
          aria-label={enLabel}
          onClick={() => void setLocale("en")}
        >
          EN
        </button>
      </div>
    );
  }

  return (
    <div className="kn-locale" aria-label={label}>
      <button
        type="button"
        className={`kn-locale__btn ${locale === "tr" ? "kn-locale__btn--active" : ""}`}
        disabled={busy}
        onClick={() => void setLocale("tr")}
      >
        {trLabel}
      </button>
      <button
        type="button"
        className={`kn-locale__btn ${locale === "en" ? "kn-locale__btn--active" : ""}`}
        disabled={busy}
        onClick={() => void setLocale("en")}
      >
        {enLabel}
      </button>
    </div>
  );
}
