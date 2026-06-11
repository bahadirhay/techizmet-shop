"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { GscClientState } from "@/lib/admin/gsc/settings";

type GscQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GscCacheInfo = {
  lastSyncAt: string;
  startDate: string;
  endDate: string;
  days: number;
  rowCount?: number;
  error?: string;
};

export function GscPanel({ initial }: { initial: GscClientState }) {
  const [g, setG] = useState(initial);
  const [cache, setCache] = useState<GscCacheInfo | null>(null);
  const [queries, setQueries] = useState<GscQueryRow[]>([]);
  const [syncDays, setSyncDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadQueries = useCallback(async () => {
    const res = await fetch("/api/admin/gsc/queries?limit=30");
    const j = (await res.json()) as {
      queries?: GscQueryRow[];
      cache?: GscCacheInfo | null;
      message?: string;
      gsc?: GscClientState;
    };
    if (res.ok) {
      setQueries(j.queries ?? []);
      setCache(j.cache ?? null);
      if (j.message && !j.queries?.length) setMsg(j.message);
    }
  }, []);

  useEffect(() => {
    void loadQueries();
  }, [loadQueries]);

  async function saveGsc() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/gsc/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gsc: g }),
    });
    const j = (await res.json()) as { gsc?: GscClientState; error?: string };
    setBusy(false);
    if (res.ok && j.gsc) {
      setG(j.gsc);
      setMsg("GSC ayarları kaydedildi");
    } else {
      setMsg(j.error ?? "Kayıt başarısız");
    }
  }

  async function syncNow() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/gsc/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: syncDays }),
    });
    const j = (await res.json()) as {
      ok?: boolean;
      error?: string;
      cached?: GscCacheInfo & { rowCount: number };
    };
    setBusy(false);
    if (res.ok && j.ok) {
      setMsg(`${j.cached?.rowCount ?? 0} sorgu senkronize edildi`);
      void loadQueries();
    } else {
      setMsg(j.error ?? "Senkron başarısız");
      void loadQueries();
    }
  }

  return (
    <section className="rounded-xl border bg-white p-6 space-y-4">
      <div>
        <h2 className="font-semibold">Google Search Console</h2>
        <p className="mt-1 text-sm text-zinc-600">
          <a
            href="https://search.google.com/search-console?resource_id=sc-domain:anatolianpaw.com"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            anatolianpaw.com
          </a>{" "}
          organik arama sorguları — günlük/haftalık blog konu kaynağı.
        </p>
      </div>

      {!g.credentialsConfigured ? (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Servis hesabı henüz tanımlı değil</p>
          <p className="mt-1">
            <code className="rounded bg-white/80 px-1">.env</code> dosyasına{" "}
            <code className="rounded bg-white/80 px-1">GSC_SERVICE_ACCOUNT_JSON</code> ekleyin ve servis
            hesabı e-postasını Search Console&apos;da <strong>Tam kullanıcı</strong> olarak davet edin.
          </p>
        </div>
      ) : (
        <p className="text-sm text-emerald-700">
          Kimlik bilgisi hazır — {g.serviceAccountEmail}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        <AdminField label="GSC mülkü">
          <input
            className={inputClass}
            value={g.property}
            onChange={(e) => setG({ ...g, property: e.target.value })}
            placeholder="sc-domain:anatolianpaw.com"
          />
        </AdminField>
        <AdminField label="Min. tıklama (blog kuyruğu)">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={g.minClicks}
            onChange={(e) => setG({ ...g, minClicks: Number(e.target.value) || 1 })}
          />
        </AdminField>
        <AdminField label="GSC tıklama skoru">
          <input
            type="number"
            min={1}
            max={10}
            className={inputClass}
            value={g.clickWeight}
            onChange={(e) => setG({ ...g, clickWeight: Number(e.target.value) || 2 })}
          />
        </AdminField>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={g.enabled}
            onChange={(e) => setG({ ...g, enabled: e.target.checked })}
          />
          GSC senkronunu etkinleştir
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={g.includeInBlogTopics}
            onChange={(e) => setG({ ...g, includeInBlogTopics: e.target.checked })}
          />
          Blog konu kuyruğuna dahil et
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => void saveGsc()}>
          GSC ayarlarını kaydet
        </button>
        <label className="text-sm">
          Dönem
          <select
            className={`${inputClass} ml-2 w-auto`}
            value={syncDays}
            onChange={(e) => setSyncDays(Number(e.target.value))}
          >
            <option value={1}>1 gün</option>
            <option value={7}>7 gün</option>
            <option value={28}>28 gün</option>
          </select>
        </label>
        <button type="button" className={btnPrimary} disabled={busy || !g.credentialsConfigured} onClick={() => void syncNow()}>
          Şimdi senkronize et
        </button>
      </div>

      {cache ? (
        <p className="text-xs text-zinc-500">
          Son senkron: {new Date(cache.lastSyncAt).toLocaleString("tr-TR")} · {cache.startDate} →{" "}
          {cache.endDate} ({cache.days} gün)
          {cache.error ? <span className="text-red-600"> · Hata: {cache.error}</span> : null}
        </p>
      ) : null}

      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}

      {queries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="py-2 pr-4">Sorgu</th>
                <th className="py-2 pr-4">Tıklama</th>
                <th className="py-2 pr-4">Gösterim</th>
                <th className="py-2">Pozisyon</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((q) => (
                <tr key={q.query} className="border-b border-zinc-100">
                  <td className="py-2 pr-4 font-medium">{q.query}</td>
                  <td className="py-2 pr-4">{q.clicks}</td>
                  <td className="py-2 pr-4">{q.impressions}</td>
                  <td className="py-2">{q.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Henüz sorgu yok. Servis hesabını bağladıktan sonra <strong>Şimdi senkronize et</strong> ile
          çekin. Otomatik için cron:{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">
            GET /api/cron/gsc/sync?secret=CRON_SECRET&days=7
          </code>
        </p>
      )}

      <p className="text-xs text-zinc-500">
        GSC verisi 2–3 gün gecikmeli gelir; API son 2 günü hariç tutar. Detay:{" "}
        <Link href="/admin/settings/cron-health" className="underline">
          Cron sağlığı
        </Link>
      </p>
    </section>
  );
}
