"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import type { BingRecommendationStatus, BingWebmasterScan } from "@/lib/admin/bing-webmaster/types";

function statusBadge(status: BingRecommendationStatus) {
  switch (status) {
    case "pass":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "warn":
      return "bg-amber-50 text-amber-900 border-amber-200";
    default:
      return "bg-red-50 text-red-800 border-red-200";
  }
}

function statusLabel(status: BingRecommendationStatus) {
  switch (status) {
    case "pass":
      return "Tamam";
    case "warn":
      return "İyileştir";
    default:
      return "Eksik";
  }
}

export function BingWebmasterPanel() {
  const [scan, setScan] = useState<BingWebmasterScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [bingCode, setBingCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bing-webmaster");
      if (!res.ok) throw new Error("Yüklenemedi");
      const data = (await res.json()) as BingWebmasterScan;
      setScan(data);
      setBingCode(data.bingVerification.value);
    } catch {
      setMsg("Bing panel verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: string, payload?: Record<string, string>) {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/bing-webmaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        scan?: BingWebmasterScan;
        indexing?: { indexNow?: { submitted?: number }; errors?: string[] };
        fix?: { pages?: { succeeded?: number }; products?: { succeeded?: number } };
      };
      if (!res.ok) throw new Error(json.error ?? "İşlem başarısız");
      if (json.scan) {
        setScan(json.scan);
        setBingCode(json.scan.bingVerification.value);
      }
      if (action === "run-indexing") {
        setMsg(
          `IndexNow: ${json.indexing?.indexNow?.submitted ?? 0} URL bildirildi.${
            json.indexing?.errors?.length ? ` Uyarı: ${json.indexing.errors.join(" · ")}` : ""
          }`,
        );
      } else if (action === "fix-meta") {
        setMsg(
          `Meta güncellendi — sayfa: ${json.fix?.pages?.succeeded ?? 0}, ürün: ${json.fix?.products?.succeeded ?? 0}.`,
        );
      } else if (action === "save-bing-verification") {
        setMsg("Bing doğrulama kodu kaydedildi. Bing Webmaster'da doğrulamayı tamamlayın.");
      } else if (action === "mark-backlinks-noted") {
        setMsg("Geri bağlantı planı işaretlendi.");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--kn-muted)]">Bing önerileri yükleniyor…</p>;
  }

  if (!scan) {
    return <p className="text-sm text-red-600">{msg ?? "Veri yok"}</p>;
  }

  const topRecs = scan.recommendations.filter((r) =>
    ["indexnow", "meta-descriptions", "backlinks"].includes(r.id),
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--kn-muted)]">
        Bing Webmaster ekranındaki &quot;En iyi öneriler&quot; maddelerinin karşılığı. Teknik adımlar buradan
        yönetilir; geri bağlantı stratejisi operasyoneldir.
      </p>

      {msg ? <p className="text-sm rounded-lg border border-[var(--kn-border)] bg-[var(--kn-surface)] px-4 py-3">{msg}</p> : null}

      {!scan.aiEnabled ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Meta açıklama otomatik uzatma için{" "}
          <Link href="/admin/settings/seo-ai" className="underline">
            SEO AI
          </Link>{" "}
          anahtarı gerekir.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {topRecs.map((rec) => (
          <article
            key={rec.id}
            className={`rounded-xl border p-4 space-y-3 ${statusBadge(rec.status)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                {rec.bingLabel ? (
                  <p className="text-xs font-medium uppercase tracking-wide opacity-80">{rec.bingLabel}</p>
                ) : null}
                <h3 className="font-semibold">{rec.title}</h3>
              </div>
              <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs bg-white/60">
                {statusLabel(rec.status)}
              </span>
            </div>
            <p className="text-sm">{rec.detail}</p>

            {rec.id === "indexnow" ? (
              <div className="space-y-2">
                <p className="text-xs">
                  Anahtar:{" "}
                  <a href={scan.urls.indexNowKey} target="_blank" rel="noreferrer" className="underline">
                    indexnow-key.txt
                  </a>
                  {scan.indexNow.keyFileOk ? " ✓" : " ✗"}
                </p>
                <button
                  type="button"
                  disabled={!!busy}
                  className={btnPrimary}
                  onClick={() => void runAction("run-indexing")}
                >
                  {busy === "run-indexing" ? "Gönderiliyor…" : "IndexNow gönder"}
                </button>
              </div>
            ) : null}

            {rec.id === "meta-descriptions" ? (
              <div className="space-y-2">
                <p className="text-xs">
                  {scan.metaDescriptions.totalShort} kısa/eksik ({scan.metaDescriptions.minRecommended}+ önerilir)
                </p>
                <button
                  type="button"
                  disabled={!!busy || !scan.aiEnabled}
                  className={btnPrimary}
                  onClick={() => void runAction("fix-meta")}
                >
                  {busy === "fix-meta" ? "Uzatılıyor…" : "Meta açıklamaları uzat (AI)"}
                </button>
              </div>
            ) : null}

            {rec.id === "backlinks" ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={scan.backlinks.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={btnSecondary}
                >
                  Bing bağlantı raporu
                </a>
                <button
                  type="button"
                  disabled={!!busy}
                  className={btnSecondary}
                  onClick={() => void runAction("mark-backlinks-noted")}
                >
                  Planı not aldım
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <section className="admin-card admin-card-pad space-y-4">
        <h2 className="text-lg font-semibold">Bing site doğrulaması</h2>
        <p className="text-sm text-zinc-600">
          Bing Webmaster → Ayarlar → Doğrulama. Meta etiket yöntemini seçin; kodu buraya kaydedin.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex-1 min-w-[16rem] text-sm">
            <span className="block mb-1 text-zinc-600">msvalidate.01 içeriği</span>
            <input
              className={inputClass}
              value={bingCode}
              onChange={(e) => setBingCode(e.target.value)}
              placeholder="Bing doğrulama kodu"
            />
          </label>
          <button
            type="button"
            disabled={!!busy}
            className={btnPrimary}
            onClick={() => void runAction("save-bing-verification", { bingVerification: bingCode })}
          >
            {busy === "save-bing-verification" ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Alternatif:{" "}
          <a href={scan.urls.bingSiteAuth} target="_blank" rel="noreferrer" className="underline">
            BingSiteAuth.xml
          </a>
        </p>
      </section>

      <section className="admin-card admin-card-pad space-y-3">
        <h2 className="text-lg font-semibold">Site haritası & bağlantılar</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Sitemap URL</dt>
            <dd>
              <a href={scan.urls.sitemap} target="_blank" rel="noreferrer" className="underline">
                sitemap.xml
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Bing Webmaster</dt>
            <dd>
              <a href={scan.urls.bingWebmaster} target="_blank" rel="noreferrer" className="underline">
                bing.com/webmasters
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Son IndexNow</dt>
            <dd>
              {scan.indexNow.lastIndexNowAt
                ? new Date(scan.indexNow.lastIndexNowAt).toLocaleString("tr-TR")
                : "Henüz yok — IndexNow gönder"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Günlük otomatik tarama</dt>
            <dd>Vercel cron 05:30 (TR)</dd>
          </div>
        </dl>
        <Link href="/admin/settings/distribution" className={`${btnSecondary} inline-block`}>
          Tüm indeksleme ayarları
        </Link>
      </section>

      {scan.metaDescriptions.examples.length > 0 ? (
        <section className="admin-card admin-card-pad space-y-3">
          <h2 className="text-lg font-semibold">Kısa meta açıklamalı sayfalar</h2>
          <ul className="max-h-64 overflow-y-auto space-y-2 text-sm">
            {scan.metaDescriptions.examples.map((row) => (
              <li key={`${row.kind}-${row.id}`} className="flex justify-between gap-3 border-b pb-2">
                <div>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-zinc-500">{row.path}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-amber-700 font-medium">{row.length || 0} kr.</p>
                  <Link href={row.adminUrl} className="text-xs underline">
                    Düzenle
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void load()}>
        Yenile
      </button>
    </div>
  );
}
