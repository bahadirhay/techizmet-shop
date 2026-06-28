"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { InvoiceLineSuggestion } from "@/app/api/admin/finance/invoice-lines/suggest/route";

type Props = {
  value: string;
  onChange: (val: string) => void;
  onSelect: (s: InvoiceLineSuggestion) => void;
  placeholder?: string;
  className?: string;
  onSaveAsTemplate?: () => void;
};

export function InvoiceLineAutocomplete({ value, onChange, onSelect, placeholder, className, onSaveAsTemplate }: Props) {
  const [suggestions, setSuggestions] = useState<InvoiceLineSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    const res = await fetch(`/api/admin/finance/invoice-lines/suggest?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { suggestions: InvoiceLineSuggestion[] };
    setSuggestions(data.suggestions);
    if (data.suggestions.length > 0) setOpen(true);
  }, []);

  function handleChange(val: string) {
    onChange(val);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void fetchSuggestions(val), 200);
  }

  function handleFocus() {
    if (suggestions.length === 0) void fetchSuggestions(value);
    else setOpen(true);
  }

  function pick(s: InvoiceLineSuggestion) {
    onSelect(s);
    setOpen(false);
    setSuggestions([]);
  }

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const templates = suggestions.filter((s) => s.kind === "template");
  const products = suggestions.filter((s) => s.kind === "product");

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] rounded-md border border-zinc-200 bg-white shadow-lg">
          {templates.length > 0 && (
            <>
              <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                📋 Kayıtlı Kalemler
              </li>
              {templates.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50"
                    onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                  >
                    <div>
                      <div className="font-medium text-zinc-800">{s.description}</div>
                      <div className="text-xs text-zinc-400">{s.unit}</div>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <div>{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(s.unitPriceTl)} ₺</div>
                      <div>%{s.vatRate} KDV</div>
                    </div>
                  </button>
                </li>
              ))}
            </>
          )}
          {products.length > 0 && (
            <>
              <li className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 ${templates.length > 0 ? "border-t border-zinc-100" : ""}`}>
                🛍 Mağaza Ürünleri
              </li>
              {products.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50"
                    onMouseDown={(e) => { e.preventDefault(); pick(s); }}
                  >
                    <div className="font-medium text-zinc-800">{s.description}</div>
                    <div className="text-right text-xs text-zinc-500">
                      <div>{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(s.unitPriceTl)} ₺</div>
                      <div>%{s.vatRate} KDV</div>
                    </div>
                  </button>
                </li>
              ))}
            </>
          )}
          {onSaveAsTemplate && value.trim() && (
            <li className="border-t border-zinc-100">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-xs text-blue-600 hover:bg-blue-50"
                onMouseDown={(e) => { e.preventDefault(); setOpen(false); onSaveAsTemplate(); }}
              >
                + &quot;{value}&quot; kalemini şablon olarak kaydet
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
