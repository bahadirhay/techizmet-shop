"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SearchHit = {
  type: "product" | "order" | "customer";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export function AdminSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`);
      const json = (await res.json()) as { results?: SearchHit[] };
      setHits(json.results ?? []);
      setLoading(false);
      setOpen(true);
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && hits[0]) {
      router.push(hits[0].href);
      setOpen(false);
      setQ("");
    }
    if (e.key === "Escape") setOpen(false);
  }

  const typeLabel: Record<SearchHit["type"], string> = {
    product: "Ürün",
    order: "Sipariş",
    customer: "Müşteri",
  };

  return (
    <div ref={wrapRef} className="relative max-w-md flex-1">
      <input
        type="search"
        className={className}
        placeholder="Ürün, sipariş veya müşteri ara…"
        aria-label="Hızlı arama"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.length >= 2 && setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && q.length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-sm text-zinc-500">Aranıyor…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">Sonuç yok</p>
          ) : (
            hits.map((h) => (
              <Link
                key={`${h.type}-${h.id}`}
                href={h.href}
                className="block px-3 py-2 hover:bg-zinc-50"
                onClick={() => {
                  setOpen(false);
                  setQ("");
                }}
              >
                <span className="text-[10px] font-semibold uppercase text-zinc-400">
                  {typeLabel[h.type]}
                </span>
                <p className="text-sm font-medium text-zinc-800">{h.title}</p>
                <p className="text-xs text-zinc-500">{h.subtitle}</p>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
