"use client";

import { useState } from "react";
import Link from "next/link";
import { formatTry } from "@/lib/admin/money";
import type { CompetitorPriceReport, CompetitorPriceRow } from "@/lib/admin/product-pricing/marketplace-competitor-prices";
import { btnSecondary } from "@/components/admin/AdminForm";

const PLATFORM_LABELS: Record<CompetitorPriceRow["platform"], string> = {
  trendyol: "Trendyol",
  hepsiburada: "Hepsiburada",
};

function PriceTable({ rows, emptyText }: { rows: CompetitorPriceRow[]; emptyText: string }) {
  if (!rows.length) {
    return <p className="text-sm text-zinc-500">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-zinc-500">
            <th className="pb-2 pr-2">Platform</th>
            <th className="pb-2 pr-2">Ürün</th>
            <th className="pb-2 pr-2">Satıcı</th>
            <th className="pb-2 text-right">Fiyat</th>
            <th className="pb-2 pl-2">Link</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.platform}-${row.title}-${i}`} className="border-b border-zinc-100">
              <td className="py-2 pr-2 whitespace-nowrap">{PLATFORM_LABELS[row.platform]}</td>
              <td className="py-2 pr-2">
                <span className="font-medium">{row.title}</span>
                {row.brand ? <span className="mt-0.5 block text-xs text-zinc-500">{row.brand}</span> : null}
              </td>
              <td className="py-2 pr-2 text-xs text-zinc-600">{row.seller ?? "—"}</td>
              <td className="py-2 text-right tabular-nums whitespace-nowrap">
                <span className="font-medium">{formatTry(row.priceMinor)}</span>
                {row.originalPriceMinor && row.originalPriceMinor > row.priceMinor ? (
                  <span className="ml-1 text-xs text-zinc-400 line-through">{formatTry(row.originalPriceMinor)}</span>
                ) : null}
              </td>
              <td className="py-2 pl-2">
                {row.url ? (
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--kn-brand)] underline">
                    Gör
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductCompetitorPrices({
  title,
  barcode,
  sku,
  categoryId,
  brandId,
  webPrice,
}: {
  title: string;
  barcode: string;
  sku: string;
  categoryId: string;
  brandId: string;
  webPrice: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<CompetitorPriceReport | null>(null);

  async function load() {
    if (!title.trim()) {
      setErr("Önce ürün adını girin");
      return;
    }
    setBusy(true);
    setErr(null);
    const q = new URLSearchParams({ title: title.trim() });
    if (barcode.trim()) q.set("barcode", barcode.trim());
    if (sku.trim()) q.set("sku", sku.trim());
    if (categoryId) q.set("categoryId", categoryId);
    if (brandId) q.set("brandId", brandId);

    const res = await fetch(`/api/admin/products/competitor-prices?${q}`);
    const json = (await res.json()) as { error?: string; report?: CompetitorPriceReport };
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Rakip fiyatları alınamadı");
      return;
    }
    setReport(json.report ?? null);
  }

  const webMinor = parseFloat(webPrice.replace(",", ".")) * 100;
  const hasWebPrice = Number.isFinite(webMinor) && webMinor > 0;

  return (
    <div id="kn-competitor-prices" className="scroll-mt-6 rounded-lg border border-sky-200 bg-sky-50/60 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-950">Rakip fiyatları</p>
          <p className="mt-1 text-xs text-sky-900">
            Ürünü kaydetmeden de kullanılabilir — yeni ürün eklerken fiyat belirlemeden önce bakın.
            Trendyol ve Hepsiburada aramasından benzer listeler gelir; API tanımlıysa kendi pazaryeri
            fiyatınız da gösterilir.
          </p>
        </div>
        <button type="button" className={btnSecondary} disabled={busy || !title.trim()} onClick={() => void load()}>
          {busy ? "Aranıyor…" : "Rakip fiyatlarını getir"}
        </button>
      </div>

      {!report && !busy ? (
        <ol className="list-inside list-decimal space-y-1 text-xs text-sky-950/90">
          <li>Ürün adını yazın (kategori / marka seçerseniz arama daha isabetli olur)</li>
          <li>İsteğe bağlı: barkod veya satış fiyatı girin</li>
          <li>
            <strong>Rakip fiyatlarını getir</strong> butonuna tıklayın
          </li>
        </ol>
      ) : null}

      {err ? <p className="text-sm text-red-700">{err}</p> : null}

      {report ? (
        <>
          {report.summary.count > 0 ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                <p className="text-xs text-zinc-500">En düşük</p>
                <p className="font-semibold tabular-nums">{formatTry(report.summary.minMinor ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                <p className="text-xs text-zinc-500">Ortalama</p>
                <p className="font-semibold tabular-nums">{formatTry(report.summary.avgMinor ?? 0)}</p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                <p className="text-xs text-zinc-500">En yüksek</p>
                <p className="font-semibold tabular-nums">{formatTry(report.summary.maxMinor ?? 0)}</p>
              </div>
              {hasWebPrice && report.summary.avgMinor != null ? (
                <div className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                  <p className="text-xs text-zinc-500">Web fiyatınız vs ortalama</p>
                  <p
                    className={`font-semibold tabular-nums ${
                      webMinor > report.summary.avgMinor ? "text-amber-800" : "text-emerald-800"
                    }`}
                  >
                    {webMinor > report.summary.avgMinor ? "+" : ""}
                    {formatTry(webMinor - report.summary.avgMinor)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {report.ownListings.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-sky-950">Sizin pazaryeri fiyatlarınız (API)</p>
              <PriceTable rows={report.ownListings} emptyText="" />
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-sm font-medium text-sky-950">
              Rakip listeleri
              {report.query ? <span className="font-normal text-zinc-500"> — “{report.query}”</span> : null}
            </p>
            <PriceTable rows={report.items} emptyText="Eşleşen rakip fiyat bulunamadı." />
          </div>

          {report.notes.length > 0 ? (
            <ul className="list-inside list-disc text-xs text-zinc-600">
              {report.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="text-xs text-zinc-600">
          Pazaryeri API ayarları için{" "}
          <Link href="/admin/integrations" className="text-[var(--kn-brand)] underline">
            Entegrasyonlar
          </Link>
          . Barkod girerseniz kendi Trendyol/HB listeniz de eşleştirilir.
        </p>
      )}
    </div>
  );
}
