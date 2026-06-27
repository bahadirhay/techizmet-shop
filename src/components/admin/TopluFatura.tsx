"use client";

import { useState } from "react";

type OrderResult = {
  orderId: string;
  orderNumber: string;
  ok: boolean;
  message: string;
};

type BulkResult = {
  processed: number;
  succeeded: number;
  failed: number;
  results: OrderResult[];
  message: string;
};

export function TopluFatura({ pendingCount }: { pendingCount: number }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sign, setSign] = useState(true);
  const [sendToMarketplace, setSendToMarketplace] = useState(true);
  const [localPending, setLocalPending] = useState(pendingCount);

  async function runBulk() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const r = await fetch("/api/admin/orders/bulk-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign, sendToMarketplace }),
      });
      const data = (await r.json()) as BulkResult & { error?: string };
      if (!r.ok) {
        setError(data.error ?? "İşlem başarısız.");
        return;
      }
      setResult(data);
      setLocalPending(data.failed); // başarısız olanlar hâlâ bekliyor
    } finally {
      setRunning(false);
    }
  }

  const failures = result?.results.filter((r) => !r.ok) ?? [];
  const successes = result?.results.filter((r) => r.ok) ?? [];

  return (
    <div className="space-y-4">
      {/* Durum kartı */}
      <div
        className={`flex items-center justify-between rounded-xl border px-5 py-4 ${
          localPending > 0
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div>
          <div
            className={`text-2xl font-bold ${
              localPending > 0 ? "text-amber-800" : "text-emerald-800"
            }`}
          >
            {localPending > 0
              ? `${localPending} sipariş fatura bekliyor`
              : "Tüm siparişler faturlandı ✓"}
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Kargoya verilmiş ama henüz faturası kesilmemiş siparişler
          </div>
        </div>
        {localPending > 0 && (
          <button
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            disabled={running}
            onClick={() => void runBulk()}
          >
            {running ? "Faturalar kesiliyor…" : `${localPending} Siparişi Faturala`}
          </button>
        )}
      </div>

      {/* Seçenekler */}
      <div className="admin-card admin-card-pad">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700">Toplu Fatura Seçenekleri</h3>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sign}
              onChange={(e) => setSign(e.target.checked)}
            />
            <span>
              Otomatik imzala{" "}
              <span className="text-xs text-zinc-400">
                (GİB portalında SMS doğrulaması kapalıysa çalışır — yoksa taslak olarak gönderilir)
              </span>
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sendToMarketplace}
              onChange={(e) => setSendToMarketplace(e.target.checked)}
            />
            <span>
              Pazaryerine otomatik ilet{" "}
              <span className="text-xs text-zinc-400">(Trendyol, HB — desteklenen platformlar)</span>
            </span>
          </label>
        </div>

        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-800">
          <strong>SMS imzalama hakkında:</strong> GİB portalında Ayarlar → Güvenlik bölümünden "İmzalama için SMS doğrulaması gerektir" seçeneğini kapatırsanız tüm süreç tamamen otomatik çalışır. Aksi hâlde faturalar imzasız taslak olarak GİB'e gönderilir ve portaldaki "Toplu İmzala" ile tek tıkla imzalarsınız.
        </div>
      </div>

      {/* Hata */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
          ✗ {error}
        </div>
      )}

      {/* Sonuç özeti */}
      {result && (
        <div className="admin-card admin-card-pad space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-zinc-50 px-3 py-3">
              <div className="text-2xl font-bold text-zinc-800">{result.processed}</div>
              <div className="text-xs text-zinc-500">İşlenen</div>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-3">
              <div className="text-2xl font-bold text-emerald-700">{result.succeeded}</div>
              <div className="text-xs text-emerald-600">Başarılı</div>
            </div>
            <div className={`rounded-lg px-3 py-3 ${failures.length > 0 ? "bg-red-50" : "bg-zinc-50"}`}>
              <div className={`text-2xl font-bold ${failures.length > 0 ? "text-red-700" : "text-zinc-400"}`}>
                {result.failed}
              </div>
              <div className={`text-xs ${failures.length > 0 ? "text-red-600" : "text-zinc-400"}`}>Başarısız</div>
            </div>
          </div>

          {/* Başarılı olanlar */}
          {successes.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                ✓ Kesilen Faturalar ({successes.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {successes.map((r) => (
                  <div key={r.orderId} className="flex items-start gap-2 rounded bg-emerald-50/60 px-3 py-1.5 text-xs">
                    <span className="font-medium text-emerald-700">#{r.orderNumber}</span>
                    <span className="text-zinc-500 flex-1 truncate">{r.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Başarısız olanlar */}
          {failures.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                ✗ Başarısız ({failures.length}) — Tekrar Dene
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {failures.map((r) => (
                  <div key={r.orderId} className="rounded border border-red-100 bg-red-50/60 px-3 py-1.5 text-xs">
                    <span className="font-medium text-red-700">#{r.orderNumber}:</span>{" "}
                    <span className="text-red-600">{r.message}</span>
                  </div>
                ))}
              </div>
              <button
                className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                disabled={running}
                onClick={() => void runBulk()}
              >
                {running ? "Deneniyor…" : "Başarısızları Tekrar Dene"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* GİB portal linki */}
      <div className="text-xs text-zinc-400">
        Taslak faturalarınızı imzalamak için:{" "}
        <a
          href="https://earsivportal.efatura.gov.tr"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          earsivportal.efatura.gov.tr
        </a>{" "}
        → Fatura İşlemleri → Taslak Faturalar → Toplu İmzala
      </div>
    </div>
  );
}
