"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { sendStoreEvents } from "@/lib/analytics/client";

export function StoreSearchForm({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    sendStoreEvents([{ type: "search_query", payload: { query: term, source: "form" } }]);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form className={className} onSubmit={submit} role="search">
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ürün ara…"
        className="kn-search-input"
        minLength={2}
        aria-label="Ürün ara"
      />
      <button type="submit" className="kn-search-btn">
        Ara
      </button>
    </form>
  );
}
