"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function FavoriteButton({
  productId,
  className = "",
  showLabel = false,
}: {
  productId: string;
  className?: string;
  showLabel?: boolean;
}) {
  const [active, setActive] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/account/favorites", { credentials: "same-origin" })
      .then((r) => {
        if (r.status === 401) {
          setLoggedIn(false);
          return null;
        }
        return r.json() as Promise<{ productIds?: string[] }>;
      })
      .then((j) => {
        if (!j) return;
        setLoggedIn(true);
        setActive((j.productIds ?? []).includes(productId));
      });
  }, [productId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loggedIn === false) return;
    if (loggedIn === null) return;
    setBusy(true);
    const res = await fetch("/api/account/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ productId }),
    });
    setBusy(false);
    if (res.status === 401) {
      setLoggedIn(false);
      return;
    }
    if (res.ok) {
      const j = (await res.json()) as { favorited?: boolean };
      setActive(Boolean(j.favorited));
    }
  }

  if (loggedIn === false) {
    return (
      <Link
        href={`/account/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
        className={`kn-fav-btn kn-fav-btn--guest ${className}`}
        title="Favorilere eklemek için giriş yapın"
        onClick={(e) => e.stopPropagation()}
      >
        ♡
        {showLabel ? <span className="kn-fav-btn__label">Favori</span> : null}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`kn-fav-btn ${active ? "kn-fav-btn--on" : ""} ${className}`}
      onClick={toggle}
      disabled={busy || loggedIn === null}
      aria-pressed={active}
      title={active ? "Favorilerden çıkar" : "Favorilere ekle"}
    >
      {active ? "♥" : "♡"}
      {showLabel ? <span className="kn-fav-btn__label">{active ? "Favoride" : "Favori"}</span> : null}
    </button>
  );
}
