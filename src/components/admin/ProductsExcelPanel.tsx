"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";

type ImportResult = {
  summary: { total: number; created: number; updated: number; failed: number };
  results: { rowNum: number; title: string; action: string; error?: string }[];
};

export function ProductsExcelPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    setImportResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/products/import", { method: "POST", body: fd });
    const json = (await res.json()) as ImportResult & { error?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "İçe aktarma başarısız");
      return;
    }
    setImportResult(json);
    router.refresh();
  }

  return (
    <div className="admin-card admin-card-pad mb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Excel dışa / içe aktar</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Tüm ürünleri .xlsx olarak indirin veya Excel ile toplu ürün ekleyin / güncelleyin. Güncelleme: ID,
            SKU veya slug ile eşleşir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/products/export" className={btnSecondary} download>
            Excel indir
          </a>
          <a href="/api/admin/products/export?template=1" className={btnSecondary} download>
            Boş şablon
          </a>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Yükleniyor…" : "Excel yükle"}
          </button>
        </div>
      </div>

      {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}

      {importResult ? (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-800">
            {importResult.summary.created} yeni · {importResult.summary.updated} güncellendi ·{" "}
            {importResult.summary.failed} hata ({importResult.summary.total} satır)
          </p>
          {importResult.results.some((r) => r.error) ? (
            <ul className="mt-2 max-h-40 overflow-auto text-xs text-red-700">
              {importResult.results
                .filter((r) => r.error)
                .slice(0, 20)
                .map((r) => (
                  <li key={r.rowNum}>
                    Satır {r.rowNum} ({r.title}): {r.error}
                  </li>
                ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <details className="mt-3 text-xs text-zinc-500">
        <summary className="cursor-pointer font-medium text-zinc-600">Sütun rehberi</summary>
        <ul className="mt-2 list-inside list-disc space-y-0.5">
          <li>
            <strong>Ürün Adı</strong> zorunlu; yeni ürün için slug boş bırakılabilir (otomatik üretilir).
          </li>
          <li>
            <strong>Kategori / Marka / Koleksiyon</strong>: admindeki slug değerleri (ör.{" "}
            <code>cilt-bakimi</code>, <code>techizmet-shop</code>).
          </li>
          <li>
            <strong>Etiketler</strong>: virgülle — new, bestseller, free_shipping, sale, …
          </li>
          <li>
            <strong>Yayında</strong>: Evet veya Hayır
          </li>
          <li>
            <strong>Fiyat (TL)</strong>: 534 veya 534,00
          </li>
        </ul>
      </details>
    </div>
  );
}
