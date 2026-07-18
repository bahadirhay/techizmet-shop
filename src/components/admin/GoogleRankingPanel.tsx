"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import { GscPanel } from "@/components/admin/GscPanel";
import type { GscClientState } from "@/lib/admin/gsc/settings";
import type { GoogleRankingSnapshot, PrimaryKeywordRow } from "@/lib/admin/google-ranking/scan";

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 55) return "text-amber-700";
  return "text-red-700";
}

function positionLabel(row: PrimaryKeywordRow): string {
  if (row.gsc.matchKind === "none" || row.gsc.impressions <= 0) return "Veri yok";
  const pos = row.gsc.position;
  if (pos <= 3) return `#${pos.toFixed(1)} · üst sıra`;
  if (pos <= 10) return `#${pos.toFixed(1)} · 1. sayfa`;
  if (pos <= 20) return `#${pos.toFixed(1)} · 2. sayfa`;
  return `#${pos.toFixed(1)}`;
}

function positionTone(row: PrimaryKeywordRow): string {
  if (row.gsc.matchKind === "none" || row.gsc.impressions <= 0) return "text-zinc-500";
  if (row.gsc.position <= 3) return "text-emerald-700";
  if (row.gsc.position <= 10) return "text-emerald-800";
  if (row.gsc.position <= 20) return "text-amber-700";
  return "text-red-700";
}

export function GoogleRankingPanel({ gscInitial }: { gscInitial: GscClientState }) {
  const [snapshot, setSnapshot] = useState<GoogleRankingSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [intentBusy, setIntentBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/google-ranking");
      if (!res.ok) throw new Error("Yüklenemedi");
      const data = (await res.json()) as GoogleRankingSnapshot;
      setSnapshot(data);
    } catch {
      setMsg("Google sıralama verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncGsc() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/google-ranking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-gsc", days: 28 }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        error?: string;
        snapshot?: GoogleRankingSnapshot;
      };
      if (j.snapshot) setSnapshot(j.snapshot);
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Senkron başarısız");
      setMsg("Google Search Console verileri güncellendi (son 28 gün).");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Senkron hatası");
    } finally {
      setBusy(false);
    }
  }

  async function applyMeta(intentId: string) {
    setIntentBusy(intentId);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/search-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId, action: "apply-meta" }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Meta uygulanamadı");
      setMsg("Landing meta uygulandı ve arama motorlarına bildirildi.");
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setIntentBusy(null);
    }
  }

  if (loading && !snapshot) {
    return <p className="text-sm text-[var(--kn-muted)]">Google sıralama paneli yükleniyor…</p>;
  }

  const primary = snapshot?.primary ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-emerald-950">Öncelikli 3 Google araması</h2>
            <p className="mt-1 text-sm text-emerald-900/80">
              Hedef: <strong>Köpek Ödül Maması</strong>, <strong>Ödül maması</strong>,{" "}
              <strong>Doğal Köpek Ödül Maması</strong> — her biri için ayrı landing, title/description, FAQ
              schema ve iç linkler hazır. Google sırası Search Console senkronundan gelir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => void syncGsc()}>
              {busy ? "Senkron…" : "GSC senkron (28 gün)"}
            </button>
            <a
              href="https://search.google.com/search-console?resource_id=sc-domain:anatolianpaw.com"
              target="_blank"
              rel="noreferrer"
              className={btnPrimary}
            >
              Search Console’u aç
            </a>
          </div>
        </div>
        {msg ? <p className="text-sm text-emerald-950">{msg}</p> : null}
        {snapshot?.gsc.cache?.error ? (
          <p className="text-sm text-red-700">Son GSC hatası: {snapshot.gsc.cache.error}</p>
        ) : null}
        {!snapshot?.gsc.config.credentialsConfigured ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            GSC servis hesabı henüz tanımlı değil. Aşağıdaki Google Search Console bölümünden kurulum
            adımlarını tamamlayın; ardından senkron ile sıra verileri buraya düşer.
          </p>
        ) : snapshot?.gsc.cache?.lastSyncAt ? (
          <p className="text-xs text-emerald-900/70">
            Son senkron: {new Date(snapshot.gsc.cache.lastSyncAt).toLocaleString("tr-TR")} ·{" "}
            {snapshot.gsc.cache.startDate} → {snapshot.gsc.cache.endDate} ·{" "}
            {snapshot.gsc.cache.rowCount ?? 0} sorgu
          </p>
        ) : (
          <p className="text-xs text-amber-800">Henüz GSC senkronu yok — «GSC senkron» ile başlatın.</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {primary.map((row) => (
          <article
            key={row.intent.id}
            className="rounded-xl border bg-white p-4 shadow-sm space-y-3 flex flex-col"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Hedef sorgu</p>
              <h3 className="text-lg font-semibold text-zinc-900 capitalize">{row.intent.query}</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Landing:{" "}
                <a href={row.landingUrl} className="underline" target="_blank" rel="noreferrer">
                  {row.intent.landingPath}
                </a>
              </p>
            </div>

            <div className="rounded-lg bg-zinc-50 px-3 py-2">
              <p className="text-xs text-zinc-500">Google ortalama sıra (GSC)</p>
              <p className={`text-xl font-bold tabular-nums ${positionTone(row)}`}>{positionLabel(row)}</p>
              <p className="mt-1 text-xs text-zinc-600">
                {row.gsc.impressions.toLocaleString("tr-TR")} gösterim ·{" "}
                {row.gsc.clicks.toLocaleString("tr-TR")} tıklama
                {row.gsc.matchKind === "contains" ? (
                  <span className="text-amber-700"> · yakın varyasyon: “{row.gsc.query}”</span>
                ) : null}
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600">Landing SEO skoru</span>
              <span className={`font-semibold tabular-nums ${scoreTone(row.report?.score ?? 0)}`}>
                {row.report?.score ?? "—"}/100
              </span>
            </div>

            {row.report?.checks?.length ? (
              <ul className="space-y-1 text-xs text-zinc-600">
                {row.report.checks.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <span
                      className={
                        c.status === "pass"
                          ? "text-emerald-700"
                          : c.status === "warn"
                            ? "text-amber-700"
                            : "text-red-700"
                      }
                    >
                      {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "×"}
                    </span>{" "}
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={intentBusy === row.intent.id}
                onClick={() => void applyMeta(row.intent.id)}
              >
                {intentBusy === row.intent.id ? "Uygulanıyor…" : "Meta uygula + bildir"}
              </button>
              <Link href="/admin/settings/search-intent" className="text-xs underline text-zinc-600 self-center">
                Tüm hedefler
              </Link>
            </div>
          </article>
        ))}
      </div>

      {snapshot?.gsc.relatedQueries?.length ? (
        <section className="rounded-xl border bg-white p-5 space-y-3">
          <h2 className="font-semibold">İlgili Google sorguları (GSC)</h2>
          <p className="text-sm text-zinc-600">
            Üç hedef kelimeyle ilişkili diğer aramalar — içerik ve blog fırsatları.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-zinc-500">
                  <th className="pb-2 pr-3">Sorgu</th>
                  <th className="pb-2 pr-3 text-right">Gösterim</th>
                  <th className="pb-2 pr-3 text-right">Tıklama</th>
                  <th className="pb-2 text-right">Sıra</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.gsc.relatedQueries.map((q) => (
                  <tr key={q.query} className="border-b border-zinc-100">
                    <td className="py-1.5 pr-3">{q.query}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {q.impressions.toLocaleString("tr-TR")}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">
                      {q.clicks.toLocaleString("tr-TR")}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{q.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <GscPanel initial={gscInitial} />

      <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700 space-y-2">
        <p className="font-medium text-zinc-900">Nasıl üst sıralara çıkılır?</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Her hedef için «Meta uygula + bildir» ile title/description ve IndexNow çalıştırın.</li>
          <li>
            <Link href="/admin/settings/seo-dashboard" className="underline">
              SEO Komuta Merkezi
            </Link>
            ’nden ürün meta ve görselleri güçlendirin.
          </li>
          <li>
            <Link href="/admin/blog/automation" className="underline">
              Blog otomasyonu
            </Link>{" "}
            ile hedef kelimelerde rehber içerik üretin.
          </li>
          <li>
            Search Console’da sitemap’in (
            <code className="rounded bg-white px-1">/sitemap.xml</code>) gönderildiğinden emin olun.
          </li>
          <li>Haftalık GSC senkron ile sıra değişimini buradan takip edin.</li>
        </ol>
      </section>
    </div>
  );
}
