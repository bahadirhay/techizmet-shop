"use client";

import { useState } from "react";
import type { ShopLocale } from "@/lib/i18n/locale";

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
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setLocale(next: ShopLocale) {
    if (next === locale || busy) return;
    setBusy(true);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      const target = `${window.location.pathname}${window.location.search}`;
      window.location.assign(target);
    } catch {
      setBusy(false);
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
          onClick={() => setLocale("tr")}
        />
        <button
          type="button"
          data-locale="en"
          className={locale === "en" ? "is-active" : ""}
          disabled={busy}
          aria-label={enLabel}
          onClick={() => setLocale("en")}
        />
      </div>
    );
  }

  return (
    <div className="kn-locale" aria-label={label}>
      <button
        type="button"
        className={`kn-locale__btn ${locale === "tr" ? "kn-locale__btn--active" : ""}`}
        disabled={busy}
        onClick={() => setLocale("tr")}
      >
        {trLabel}
      </button>
      <button
        type="button"
        className={`kn-locale__btn ${locale === "en" ? "kn-locale__btn--active" : ""}`}
        disabled={busy}
        onClick={() => setLocale("en")}
      >
        {enLabel}
      </button>
    </div>
  );
}
