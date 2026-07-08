"use client";

import { useState } from "react";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";

type ProductRow = {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  stockQty: number;
  listingStatus: string;
  lastError: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  none: "gönderilmedi",
  pending: "onay bekliyor",
  active: "yayında",
  inactive: "pasif",
  rejected: "reddedildi",
  exported: "gönderildi",
  error: "hata",
};

const STATUS_COLOR: Record<string, string> = {
  none: "bg-zinc-100 text-zinc-600",
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-zinc-200 text-zinc-700",
  rejected: "bg-red-100 text-red-800",
  exported: "bg-sky-100 text-sky-800",
  error: "bg-red-100 text-red-800",
};

export function AmazonProductSendPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function search() {
    if (q.trim().length < 2) {
      setMsg("En az 2 harf yazın");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/integrations/marketplaces/amazon/products?q=${encodeURIComponent(q.trim())}`,
      );
      const json = (await res.json().catch(() => ({}))) as { products?: ProductRow[]; error?: string };
      if (!res.ok) {
        setMsg(json.error ?? "Arama başarısız");
        return;
      }
      setResults(json.products ?? []);
      setSelected(new Set());
      setSearched(true);
    } catch {
      setMsg("Arama hatası — bağlantıyı kontrol edin");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    const ids = [...selected];
    if (ids.length === 0) {
      setMsg("Gönderilecek ürün seçin");
      return;
    }
    setBusy(true);
    setMsg(`${ids.length} ürün Amazon'a gönderiliyor… (birkaç dakika sürebilir, sayfayı kapatmayın)`);
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/amazon/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        result?: { ok: boolean; message: string };
        error?: string;
      };
      if (!res.ok) {
        setMsg(json.error ?? "Gönderim başarısız");
        return;
      }
      setMsg(json.result?.message ?? "Gönderildi");
      await search();
    } catch {
      setMsg("Gönderim hatası veya zaman aşımı — birkaç dakika sonra durumu kontrol edin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-emerald-900">
          Amazon&apos;a ürün gönder — ada göre bul &amp; seçili gönder
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          Ürünü adıyla ara, göndermek istediklerini seç, &quot;Seçiliyi gönder&quot;e bas. Yeni
          ilanlar Amazon&apos;da birkaç dakikada işlenir; reddedilenlerde Amazon&apos;un istediği
          eksik alan durum olarak yazılır.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className={`${inputClass} min-w-[16rem] flex-1`}
          value={q}
          placeholder="Ürün adı (en az 2 harf)"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
        />
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => void search()}>
          {busy ? "…" : "Ara"}
        </button>
        <button type="button" className={btnPrimary} disabled={busy || selected.size === 0} onClick={() => void send()}>
          {busy ? "…" : `Seçiliyi gönder${selected.size ? ` (${selected.size})` : ""}`}
        </button>
      </div>

      {msg ? <p className="text-xs text-emerald-900">{msg}</p> : null}

      {searched && results.length === 0 ? (
        <p className="text-xs text-zinc-500">Sonuç yok.</p>
      ) : null}

      {results.length > 0 ? (
        <ul className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-emerald-200 bg-white p-2">
          {results.map((p) => {
            const checked = selected.has(p.id);
            return (
              <li key={p.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-emerald-50 ${
                    checked ? "bg-emerald-50" : ""
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} />
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <span className="h-8 w-8 rounded bg-zinc-100" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-zinc-900">{p.title}</span>
                    <span className="block truncate text-xs text-zinc-500">
                      SKU: {p.sku || "—"} · Barkod: {p.barcode || "—"} · Stok: {p.stockQty}
                      {p.lastError ? ` · ${p.lastError.slice(0, 80)}` : ""}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      STATUS_COLOR[p.listingStatus] ?? STATUS_COLOR.none
                    }`}
                  >
                    {STATUS_LABEL[p.listingStatus] ?? p.listingStatus}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
