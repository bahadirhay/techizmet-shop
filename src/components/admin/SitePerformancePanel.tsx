"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { SitePerformanceReport, SitePerfCheck } from "@/lib/admin/site-performance/types";

function statusLabel(status: SitePerfCheck["status"]) {
  if (status === "pass") return "Tamam";
  if (status === "warn") return "Uyarı";
  if (status === "fail") return "Sorun";
  return "Bilgi";
}

function statusClass(status: SitePerfCheck["status"]) {
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "warn") return "border-amber-200 bg-amber-50 text-amber-900";
  if (status === "fail") return "border-red-200 bg-red-50 text-red-900";
  return "border-sky-200 bg-sky-50 text-sky-900";
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? "text-zinc-900"}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function SitePerformancePanel() {
  const [report, setReport] = useState<SitePerformanceReport | null>(null);
  const [busy, setBusy] = useState<"scan" | string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy("scan");
    setMsg(null);
    try {
      const res = await fetch("/api/admin/site-performance");
      const j = (await res.json()) as SitePerformanceReport & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Tarama başarısız");
      setReport(j);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Tarama başarısız");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: NonNullable<SitePerfCheck["fixAction"]>, label: string) {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/site-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = (await res.json()) as {
        error?: string;
        fix?: { processed: number; succeeded: number; errors: string[] };
        optimize?: { updated: number };
        scan: SitePerformanceReport;
      };
      if (!res.ok) throw new Error(j.error ?? "İşlem başarısız");
      setReport(j.scan);
      if (action === "seo-dashboard-fix" && j.fix) {
        setMsg(
          `${j.fix.succeeded} ürün meta güncellendi${j.fix.errors.length ? ` (${j.fix.errors.length} hata)` : ""}.`,
        );
      } else if (action === "seo-optimize" && j.optimize) {
        setMsg(`${j.optimize.updated} sayfa/ayar güncellendi.`);
      } else if (action === "revalidate-cache") {
        setMsg("Vitrin önbelleği temizlendi.");
      } else {
        setMsg(`${label} tamamlandı.`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusy(null);
    }
  }

  const psi = report?.psi;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-700">
        <h2 className="font-semibold text-zinc-900">Lighthouse uyarıları ne demek?</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>Oluşturma engelleyen CSS</strong> — Sayfa açılırken büyük CSS dosyası ilk çizimi geciktirir.
            Mirror vitrinde tema CSS&apos;i iframe içinde; ana kabukta yalnızca hafif shell CSS yüklenir.
          </li>
          <li>
            <strong>Eski JavaScript (polyfill)</strong> — Modern tarayıcılarda gereksiz uyumluluk kodu (~12 KiB).
            Proje modern tarayıcı hedefiyle derlenir.
          </li>
          <li>
            <strong>Görsel boyutu / ağ yükü</strong> — Büyük JPG/PNG dosyaları LCP ve Speed Index&apos;i kötüleştirir.
            Resize API ile WebP ve doğru genişlik kullanılır.
          </li>
          <li>
            <strong>NO_LCP / yüksek Speed Index (mobil)</strong> — Vitrin iframe içinde olduğu için Lighthouse bazen
            ana pencerede LCP ölçemez; bu mimari sınırdır, tam çözüm native vitrin olur.
          </li>
          <li>
            <strong>CLS (layout shift)</strong> — Görseller yüklenirken sayfa kayması. Hero için boyut rezervasyonu ve
            font swap kullanılır.
          </li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void load()}>
          {busy === "scan" ? "Taranıyor…" : "Yeniden tara"}
        </button>
        <Link href="/admin/settings/seo-dashboard" className={btnSecondary}>
          SEO Komuta Merkezi
        </Link>
        <Link href="/admin/settings/image-guide" className={btnSecondary}>
          Görsel boyutları
        </Link>
      </div>

      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}

      {report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Tamam" value={report.summary.pass} tone="text-emerald-700" />
            <Kpi label="Uyarı" value={report.summary.warn} tone="text-amber-700" />
            <Kpi label="Sorun" value={report.summary.fail} tone="text-red-700" />
            <Kpi
              label="Site"
              value={new URL(report.siteUrl).hostname}
              hint={new Date(report.scannedAt).toLocaleString("tr-TR")}
            />
          </div>

          {psi?.mobile?.performance !== null && psi?.mobile?.performance !== undefined ? (
            <section className="admin-card admin-card-pad">
              <h2 className="text-lg font-semibold">Canlı PageSpeed (Google)</h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Mobil performans</dt>
                  <dd className="text-xl font-semibold">{psi.mobile?.performance ?? "—"}</dd>
                  <dd className="text-xs text-zinc-500">
                    LCP {psi.mobile?.lcpMs ? `${(psi.mobile.lcpMs / 1000).toFixed(1)} sn` : "—"} · CLS{" "}
                    {psi.mobile?.cls?.toFixed(3) ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Masaüstü performans</dt>
                  <dd className="text-xl font-semibold">{psi.desktop?.performance ?? "—"}</dd>
                  <dd className="text-xs text-zinc-500">
                    LCP {psi.desktop?.lcpMs ? `${(psi.desktop.lcpMs / 1000).toFixed(1)} sn` : "—"} · CLS{" "}
                    {psi.desktop?.cls?.toFixed(3) ?? "—"}
                  </dd>
                </div>
              </dl>
            </section>
          ) : (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Canlı Lighthouse skoru için ortam değişkeni{" "}
              <code className="text-xs">GOOGLE_PAGESPEED_API_KEY</code> tanımlayın (Google Cloud Console → PageSpeed
              Insights API).
            </p>
          )}

          <section className="admin-card admin-card-pad space-y-3">
            <h2 className="text-lg font-semibold">Denetimler ve düzeltmeler</h2>
            <ul className="space-y-3">
              {report.checks.map((check) => (
                <li key={check.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-zinc-900">{check.label}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(check.status)}`}
                        >
                          {statusLabel(check.status)}
                        </span>
                        {check.lighthouseId ? (
                          <span className="text-xs text-zinc-400">Lighthouse: {check.lighthouseId}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">{check.explanation}</p>
                      <p className="mt-2 text-sm text-zinc-800">{check.detail}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {check.fixHref ? (
                        <Link href={check.fixHref} className={btnSecondary}>
                          {check.fixLabel ?? "Aç"}
                        </Link>
                      ) : null}
                      {check.fixAction ? (
                        <button
                          type="button"
                          className={check.fixAction === "seo-dashboard-fix" ? btnPrimary : btnSecondary}
                          disabled={!!busy || (check.fixAction === "seo-dashboard-fix" && !report.aiEnabled)}
                          onClick={() => void runAction(check.fixAction!, check.fixLabel ?? check.label)}
                        >
                          {busy === check.fixAction
                            ? "Çalışıyor…"
                            : (check.fixLabel ?? "Düzelt")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : busy === "scan" ? (
        <p className="text-sm text-zinc-500">Site performansı taranıyor…</p>
      ) : null}
    </div>
  );
}
