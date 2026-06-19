"use client";

import { useEffect, useRef, useState } from "react";
import { AdminField, inputClass } from "@/components/admin/AdminForm";
import type { CustomerCounterpartyPrefill } from "@/lib/finance/customer-counterparty-prefill";

export function SiteMemberSearchField({
  value,
  onSelect,
  onClear,
}: {
  value: CustomerCounterpartyPrefill | null;
  onSelect: (member: CustomerCounterpartyPrefill) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerCounterpartyPrefill[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      setBusy(true);
      void fetch(`/api/admin/finance/customers/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((j: { customers?: CustomerCounterpartyPrefill[] }) => {
          setResults(j.customers ?? []);
          setOpen(true);
        })
        .finally(() => setBusy(false));
    }, 280);
    return () => window.clearTimeout(t);
  }, [query, value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (value) {
    return (
      <AdminField label="Seçilen üye">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
          <span className="font-medium">{value.label}</span>
          {value.hasCounterparty ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
              Zaten cari kayıtlı
            </span>
          ) : null}
          <button
            type="button"
            className="ml-auto text-[var(--kn-brand)] underline"
            onClick={() => {
              onClear();
              setQuery("");
              setResults([]);
            }}
          >
            Değiştir
          </button>
        </div>
      </AdminField>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <AdminField label="Site üyesi ara" hint="Ad, soyad, e-posta veya telefon (en az 2 karakter)">
        <input
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Örn. ahmet, @gmail, 532…"
          autoComplete="off"
        />
      </AdminField>
      {busy ? <p className="mt-1 text-xs text-zinc-500">Aranıyor…</p> : null}
      {open && results.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                onClick={() => {
                  onSelect(m);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="font-medium">{m.label}</span>
                {m.phone ? <span className="ml-2 text-zinc-500">{m.phone}</span> : null}
                {m.hasCounterparty ? (
                  <span className="ml-2 text-xs text-amber-700">· cari var</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && !busy && query.trim().length >= 2 && results.length === 0 ? (
        <p className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 shadow">
          Sonuç yok
        </p>
      ) : null}
    </div>
  );
}
