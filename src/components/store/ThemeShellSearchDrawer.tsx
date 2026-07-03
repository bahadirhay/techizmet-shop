"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sendStoreEvents } from "@/lib/analytics/client";
import type { ShopLocale } from "@/lib/i18n/locale";

type SuggestProduct = { title: string; url: string; image?: string | null; price?: string | null };
type SuggestCollection = { title: string; url: string; image?: string | null };
type SuggestResponse = {
  resources?: {
    results?: {
      products?: SuggestProduct[];
      collections?: SuggestCollection[];
    };
  };
};

const STR = {
  tr: {
    title: "Ara",
    placeholder: "Ürün ara…",
    close: "Kapat",
    products: "Ürünler",
    collections: "Koleksiyonlar",
    empty: "Sonuç bulunamadı.",
    all: "Tüm sonuçları gör",
  },
  en: {
    title: "Search",
    placeholder: "Search products…",
    close: "Close",
    products: "Products",
    collections: "Collections",
    empty: "No results found.",
    all: "See all results",
  },
} as const;

export function ThemeShellSearchDrawer({
  open,
  onClose,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  locale: ShopLocale;
}) {
  const t = locale === "en" ? STR.en : STR.tr;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<SuggestProduct[]>([]);
  const [collections, setCollections] = useState<SuggestCollection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const focusT = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.clearTimeout(focusT);
    };
  }, [open, onClose]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setProducts([]);
      setCollections([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/store/search/suggest?q=${encodeURIComponent(term)}`, {
          credentials: "same-origin",
        });
        if (!res.ok) throw new Error("suggest failed");
        const j = (await res.json()) as SuggestResponse;
        if (cancelled) return;
        setProducts(j.resources?.results?.products ?? []);
        setCollections(j.resources?.results?.collections ?? []);
      } catch {
        if (!cancelled) {
          setProducts([]);
          setCollections([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    sendStoreEvents([{ type: "search_query", payload: { query: term, source: "drawer" } }]);
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  if (!open) return null;

  const hasResults = products.length > 0 || collections.length > 0;
  const term = q.trim();

  return (
    <>
      <button type="button" className="kn-search-overlay" aria-label={t.close} onClick={onClose} />
      <aside className="kn-search-drawer" role="dialog" aria-label={t.title}>
        <div className="kn-search-drawer__head">
          <form className="kn-search-drawer__form" onSubmit={submit} role="search">
            <svg width="18" height="19" viewBox="0 0 18 19" fill="none" aria-hidden="true">
              <path
                d="M7.96875 15.6875C11.9556 15.6875 15.1875 12.4556 15.1875 8.4688C15.1875 4.48194 11.9556 1.25 7.96875 1.25C3.98194 1.25 0.75 4.48194 0.75 8.4688C0.75 12.4556 3.98194 15.6875 7.96875 15.6875Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.0732 13.5742L17.2497 17.7508"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              ref={inputRef}
              type="search"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              autoComplete="off"
            />
          </form>
          <button type="button" className="kn-search-drawer__close" onClick={onClose} aria-label={t.close}>
            ×
          </button>
        </div>
        <div className="kn-search-drawer__body">
          {term.length < 2 ? null : loading && !hasResults ? (
            <p className="kn-search-drawer__hint">…</p>
          ) : !hasResults ? (
            <p className="kn-search-drawer__hint">{t.empty}</p>
          ) : (
            <>
              {collections.length > 0 ? (
                <section className="kn-search-drawer__section">
                  <p className="kn-search-drawer__label">{t.collections}</p>
                  <ul className="kn-search-drawer__collections">
                    {collections.map((c) => (
                      <li key={c.url}>
                        <Link href={c.url} onClick={onClose}>
                          {c.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {products.length > 0 ? (
                <section className="kn-search-drawer__section">
                  <p className="kn-search-drawer__label">{t.products}</p>
                  <ul className="kn-search-drawer__products">
                    {products.map((p) => (
                      <li key={p.url}>
                        <Link href={p.url} className="kn-search-drawer__product" onClick={onClose}>
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt="" className="kn-search-drawer__thumb" />
                          ) : (
                            <span className="kn-search-drawer__thumb kn-search-drawer__thumb--ph" />
                          )}
                          <span className="kn-search-drawer__info">
                            <span className="kn-search-drawer__title">{p.title}</span>
                            {p.price ? <span className="kn-search-drawer__price">{p.price}</span> : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {term.length >= 2 ? (
                <Link
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="kn-btn kn-btn--outline kn-btn--block"
                  onClick={onClose}
                >
                  {t.all}
                </Link>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
