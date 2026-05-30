"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ShopLocale } from "@/lib/i18n/locale";

export function LocaleSwitcher({
  locale,
  label,
  trLabel,
  enLabel,
}: {
  locale: ShopLocale;
  label: string;
  trLabel: string;
  enLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setLocale(next: ShopLocale) {
    if (next === locale || busy) return;
    setBusy(true);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
    setBusy(false);
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
