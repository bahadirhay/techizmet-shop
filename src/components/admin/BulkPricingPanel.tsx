"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { formatTry, tryToMinor } from "@/lib/admin/money";
import type { BulkPricingPreviewResult } from "@/lib/bulk-pricing";

type Option = { id: string; label: string };

type BatchRow = {
  id: string;
  label: string | null;
  productCount: number;
  lineCount: number;
  revertedAt: string | null;
  createdAt: string;
  filterJson: string;
  adjustmentJson: string;
};

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function MultiCheck({
  options,
  selected,
  onChange,
}: {
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (!options.length) {
    return <p className="text-sm text-zinc-500">Kayıt yok</p>;
  }
  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
      {options.map((o) => (
        <label key={o.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(o.id)}
            onChange={() => onChange(toggleId(selected, o.id))}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function summarizeAdjustment(json: string): string {
  try {
    const a = JSON.parse(json) as {
      reference?: string;
      mode?: string;
      value?: number;
      roundTo?: string;
    };
    const ref =
      a.reference === "compareAt" ? "liste fiyatı" : a.reference === "base" ? "baz fiyat" : "satış fiyatı";
    if (a.mode === "percent") {
      const sign = (a.value ?? 0) >= 0 ? "+" : "";
      return `${ref} üzerinden ${sign}${a.value ?? 0}%`;
    }
    if (a.mode === "fixed_minor") {
      const tl = ((a.value ?? 0) / 100).toFixed(2);
      const sign = (a.value ?? 0) >= 0 ? "+" : "";
      return `${ref} ${sign}${tl} TL`;
    }
    if (a.mode === "set_minor") {
      return `Sabit fiyat ${((a.value ?? 0) / 100).toFixed(2)} TL`;
    }
    return json.slice(0, 60);
  } catch {
    return "—";
  }
}

export function BulkPricingPanel({
  categories,
  collections,
  brands,
}: {
  categories: Option[];
  collections: Option[];
  brands: Option[];
}) {
  const router = useRouter();
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [stockMin, setStockMin] = useState("");
  const [stockMax, setStockMax] = useState("");
  const [reference, setReference] = useState<"sale" | "compareAt" | "base">("sale");
  const [mode, setMode] = useState<"percent" | "fixed_minor" | "set_minor">("percent");
  const [percentValue, setPercentValue] = useState("10");
  const [percentUp, setPercentUp] = useState(false);
  const [amountTry, setAmountTry] = useState("");
  const [roundTo, setRoundTo] = useState<"none" | "99" | "90" | "10">("99");
  const [minMarginPercent, setMinMarginPercent] = useState("");
  const [skipBelowMinMargin, setSkipBelowMinMargin] = useState(true);
  const [label, setLabel] = useState("");
  const [preview, setPreview] = useState<BulkPricingPreviewResult | null>(null);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    const res = await fetch("/api/admin/products/pricing/batches");
    if (!res.ok) return;
    const json = (await res.json()) as { batches: BatchRow[] };
    setBatches(json.batches ?? []);
  }, []);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  function buildFilter() {
    return {
      categoryIds: categoryIds.length ? categoryIds : undefined,
      collectionIds: collectionIds.length ? collectionIds : undefined,
      brandIds: brandIds.length ? brandIds : undefined,
      stockMin: stockMin !== "" ? stockMin : undefined,
      stockMax: stockMax !== "" ? stockMax : undefined,
    };
  }

  function buildAdjustment() {
    if (mode === "percent") {
      const n = parseFloat(percentValue.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) return null;
      return {
        reference,
        mode,
        value: percentUp ? n : -n,
        roundTo,
        skipBelowMinMargin,
        minMarginPercent: minMarginPercent !== "" ? parseFloat(minMarginPercent) : undefined,
      };
    }
    const minor = tryToMinor(amountTry);
    if (minor === 0 && mode === "set_minor") return null;
    return {
      reference,
      mode,
      value: mode === "fixed_minor" && !percentUp ? -Math.abs(minor) : minor,
      roundTo,
      skipBelowMinMargin,
      minMarginPercent: minMarginPercent !== "" ? parseFloat(minMarginPercent) : undefined,
    };
  }

  async function runPreview() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const adjustment = buildAdjustment();
    if (!adjustment) {
      setBusy(false);
      setErr("Geçerli bir fiyat değeri girin");
      return;
    }
    const res = await fetch("/api/admin/products/pricing/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: buildFilter(), adjustment }),
    });
    const json = (await res.json()) as BulkPricingPreviewResult & { error?: string };
    setBusy(false);
    if (!res.ok) {
      setPreview(null);
      setErr(json.error ?? "Önizleme alınamadı");
      return;
    }
    setPreview(json);
  }

  async function runApply() {
    if (!preview || preview.changedCount === 0) {
      setErr("Önce önizleme alın ve en az bir değişiklik olmalı");
      return;
    }
    if (!window.confirm(`${preview.changedCount} satır güncellenecek. Devam?`)) return;

    setBusy(true);
    setErr(null);
    setMsg(null);
    const adjustment = buildAdjustment();
    if (!adjustment) {
      setBusy(false);
      setErr("Geçerli bir fiyat değeri girin");
      return;
    }
    const res = await fetch("/api/admin/products/pricing/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filter: buildFilter(),
        adjustment,
        label: label.trim() || undefined,
        confirm: true,
      }),
    });
    const json = (await res.json()) as { error?: string; changedCount?: number };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Uygulama başarısız");
      return;
    }
    setMsg(`${json.changedCount ?? preview.changedCount} satır güncellendi.`);
    setPreview(null);
    await loadBatches();
    router.refresh();
  }

  async function revertBatch(batchId: string) {
    if (!window.confirm("Bu toplu fiyat değişikliği geri alınsın mı?")) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/products/pricing/batches/${batchId}/revert`, {
      method: "POST",
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Geri alınamadı");
      return;
    }
    setMsg("Batch geri alındı.");
    await loadBatches();
    router.refresh();
  }

  const changedRows = preview?.rows.filter((r) => !r.skipped) ?? [];
  const skippedRows = preview?.rows.filter((r) => r.skipped) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-4 text-base font-semibold text-zinc-900">Filtreler</h2>
          <div className="space-y-4">
            <AdminField label="Kategoriler">
              <MultiCheck options={categories} selected={categoryIds} onChange={setCategoryIds} />
            </AdminField>
            <AdminField label="Koleksiyonlar">
              <MultiCheck options={collections} selected={collectionIds} onChange={setCollectionIds} />
            </AdminField>
            <AdminField label="Markalar">
              <MultiCheck options={brands} selected={brandIds} onChange={setBrandIds} />
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Stok min" hint="Ürün stok adedi">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={stockMin}
                  onChange={(e) => setStockMin(e.target.value)}
                  placeholder="örn. 0"
                />
              </AdminField>
              <AdminField label="Stok max" hint="Düşük stok için ≤5">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={stockMax}
                  onChange={(e) => setStockMax(e.target.value)}
                  placeholder="örn. 5"
                />
              </AdminField>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-4 text-base font-semibold text-zinc-900">Fiyat kuralı</h2>
          <div className="space-y-4">
            <AdminField label="Referans">
              <select
                className={inputClass}
                value={reference}
                onChange={(e) => setReference(e.target.value as typeof reference)}
              >
                <option value="sale">Mevcut satış fiyatı</option>
                <option value="compareAt">Liste / karşılaştırma fiyatı</option>
                <option value="base">Baz fiyat (ilk kayıt)</option>
              </select>
            </AdminField>

            <AdminField label="İşlem türü">
              <select
                className={inputClass}
                value={mode}
                onChange={(e) => setMode(e.target.value as typeof mode)}
              >
                <option value="percent">Yüzde (%)</option>
                <option value="fixed_minor">Sabit tutar ekle/çıkar (TL)</option>
                <option value="set_minor">Sabit fiyata ayarla (TL)</option>
              </select>
            </AdminField>

            {mode === "percent" ? (
              <div className="grid grid-cols-2 gap-3">
                <AdminField label="Oran (%)">
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    className={inputClass}
                    value={percentValue}
                    onChange={(e) => setPercentValue(e.target.value)}
                  />
                </AdminField>
                <AdminField label="Yön">
                  <select
                    className={inputClass}
                    value={percentUp ? "up" : "down"}
                    onChange={(e) => setPercentUp(e.target.value === "up")}
                  >
                    <option value="down">İndirim (−)</option>
                    <option value="up">Zam (+)</option>
                  </select>
                </AdminField>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <AdminField label={mode === "set_minor" ? "Yeni fiyat (TL)" : "Tutar (TL)"}>
                  <input
                    type="text"
                    className={inputClass}
                    value={amountTry}
                    onChange={(e) => setAmountTry(e.target.value)}
                    placeholder="49.99"
                  />
                </AdminField>
                {mode === "fixed_minor" ? (
                  <AdminField label="Yön">
                    <select
                      className={inputClass}
                      value={percentUp ? "up" : "down"}
                      onChange={(e) => setPercentUp(e.target.value === "up")}
                    >
                      <option value="down">Çıkar (−)</option>
                      <option value="up">Ekle (+)</option>
                    </select>
                  </AdminField>
                ) : null}
              </div>
            )}

            <AdminField label="Yuvarlama">
              <select
                className={inputClass}
                value={roundTo}
                onChange={(e) => setRoundTo(e.target.value as typeof roundTo)}
              >
                <option value="none">Yuvarlama yok</option>
                <option value="99">.99 (örn. 149,99)</option>
                <option value="90">.90</option>
                <option value="10">10 TL katları</option>
              </select>
            </AdminField>

            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Min. marj (%)" hint="Maliyet altına inme koruması">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={minMarginPercent}
                  onChange={(e) => setMinMarginPercent(e.target.value)}
                  placeholder="Boş = kapalı"
                />
              </AdminField>
              <AdminField label="Marj altı">
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={skipBelowMinMargin}
                    onChange={(e) => setSkipBelowMinMargin(e.target.checked)}
                  />
                  Satırı atla (uygulama)
                </label>
              </AdminField>
            </div>

            <AdminField label="Not (isteğe bağlı)">
              <input
                type="text"
                className={inputClass}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="örn. Düşük stok zammı — Mayıs"
              />
            </AdminField>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnPrimary} onClick={() => void runPreview()} disabled={busy}>
          Önizleme
        </button>
        <button
          type="button"
          className={btnSecondary}
          onClick={() => void runApply()}
          disabled={busy || !preview || preview.changedCount === 0}
        >
          Uygula
        </button>
        {err ? <span className="text-sm text-red-600">{err}</span> : null}
        {msg ? <span className="text-sm text-emerald-700">{msg}</span> : null}
      </div>

      {preview ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 text-base font-semibold text-zinc-900">Önizleme</h2>
          <p className="mb-4 text-sm text-zinc-600">
            {preview.productCount} ürün · {preview.lineCount} satır ·{" "}
            <strong>{preview.changedCount} güncellenecek</strong>
            {preview.skippedCount > 0 ? ` · ${preview.skippedCount} atlanacak` : ""}
          </p>
          {changedRows.length > 0 ? (
            <div className="mb-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-zinc-600">
                    <th className="px-2 py-2">Ürün</th>
                    <th className="px-2 py-2">Stok</th>
                    <th className="px-2 py-2">Eski</th>
                    <th className="px-2 py-2">Yeni</th>
                  </tr>
                </thead>
                <tbody>
                  {changedRows.slice(0, 100).map((r) => (
                    <tr key={`${r.productId}-${r.variantId ?? "p"}`} className="border-b border-zinc-100">
                      <td className="px-2 py-1.5">
                        {r.title}
                        {r.variantLabel ? ` — ${r.variantLabel}` : ""}
                      </td>
                      <td className="px-2 py-1.5">{r.stockQty}</td>
                      <td className="px-2 py-1.5">{formatTry(r.oldPriceMinor)}</td>
                      <td className="px-2 py-1.5 font-medium text-emerald-800">
                        {formatTry(r.newPriceMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {changedRows.length > 100 ? (
                <p className="mt-2 text-xs text-zinc-500">İlk 100 satır gösteriliyor.</p>
              ) : null}
            </div>
          ) : null}
          {skippedRows.length > 0 ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-zinc-600">
                Atlanan satırlar ({skippedRows.length})
              </summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-zinc-600">
                {skippedRows.slice(0, 50).map((r) => (
                  <li key={`skip-${r.productId}-${r.variantId ?? "p"}`}>
                    {r.title}
                    {r.variantLabel ? ` — ${r.variantLabel}` : ""}: {r.skipReason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Son uygulamalar</h2>
        {batches.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz toplu fiyat kaydı yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b text-zinc-600">
                  <th className="px-2 py-2">Tarih</th>
                  <th className="px-2 py-2">Not</th>
                  <th className="px-2 py-2">Kural</th>
                  <th className="px-2 py-2">Kapsam</th>
                  <th className="px-2 py-2">Durum</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-zinc-100">
                    <td className="px-2 py-2 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-2 py-2">{b.label || "—"}</td>
                    <td className="px-2 py-2">{summarizeAdjustment(b.adjustmentJson)}</td>
                    <td className="px-2 py-2">
                      {b.productCount} ürün / {b.lineCount} satır
                    </td>
                    <td className="px-2 py-2">
                      {b.revertedAt ? (
                        <span className="text-zinc-500">Geri alındı</span>
                      ) : (
                        <span className="text-emerald-700">Aktif</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {!b.revertedAt ? (
                        <button
                          type="button"
                          className={btnSecondary}
                          disabled={busy}
                          onClick={() => void revertBatch(b.id)}
                        >
                          Geri al
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
