"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeoReadinessReport, GeoCheckStatus } from "@/lib/seo/geo-readiness";

function statusBadge(status: GeoCheckStatus) {
  switch (status) {
    case "pass":
      return "text-emerald-700 bg-emerald-50";
    case "warn":
      return "text-amber-700 bg-amber-50";
    default:
      return "text-red-700 bg-red-50";
  }
}

function statusText(status: GeoCheckStatus) {
  switch (status) {
    case "pass":
      return "Tamam";
    case "warn":
      return "İyileştir";
    default:
      return "Eksik";
  }
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-red-700";
}

export function GeoReadinessPanel() {
  const [report, setReport] = useState<GeoReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/geo-readiness");
      if (!res.ok) throw new Error("Yüklenemedi");
      setReport((await res.json()) as GeoReadinessReport);
    } catch {
      setError("GEO denetim raporu alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-[var(--kn-muted)]">GEO denetimi yükleniyor…</p>;
  }

  if (error || !report) {
    return <p className="text-sm text-red-600">{error ?? "Veri yok"}</p>;
  }

  return (
    <section className="rounded-xl border border-[var(--kn-border)] bg-[var(--kn-surface)] p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">AI / GEO hazırlık denetimi</h2>
        <p className="text-sm text-[var(--kn-muted)] mt-1">
          ChatGPT, Perplexity ve Google AI aramalarında ürünlerinizin bulunabilirliği için teknik altyapı
          ve ürün içerik kalitesi kontrolü. Skorlar otomatik hesaplanır; Merchant Center ve ChatGPT
          merchants kayıtları manuel adımlardır.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--kn-border)] p-4">
          <p className="text-xs text-[var(--kn-muted)]">Site altyapısı</p>
          <p className={`text-2xl font-semibold ${scoreColor(report.siteScore)}`}>{report.siteScore}%</p>
        </div>
        <div className="rounded-lg border border-[var(--kn-border)] p-4">
          <p className="text-xs text-[var(--kn-muted)]">Ürün ortalama skoru</p>
          <p className={`text-2xl font-semibold ${scoreColor(report.productSummary.averageScore)}`}>
            {report.productSummary.averageScore}%
          </p>
        </div>
        <div className="rounded-lg border border-[var(--kn-border)] p-4">
          <p className="text-xs text-[var(--kn-muted)]">Hazır ürünler (≥80%)</p>
          <p className="text-2xl font-semibold">
            {report.productSummary.readyCount}/{report.productSummary.published}
          </p>
        </div>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[var(--kn-muted)]">llms.txt</dt>
          <dd>
            <a href={report.infraUrls.llmsTxt} className="underline" target="_blank" rel="noreferrer">
              llms.txt
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-[var(--kn-muted)]">JSON katalog</dt>
          <dd>
            <a href={report.infraUrls.productsJson} className="underline" target="_blank" rel="noreferrer">
              products.json
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-[var(--kn-muted)]">Sitemap</dt>
          <dd>
            <a href={report.infraUrls.sitemap} className="underline" target="_blank" rel="noreferrer">
              sitemap.xml
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-[var(--kn-muted)]">Google Merchant</dt>
          <dd>
            <a href={report.infraUrls.googleMerchant} className="underline" target="_blank" rel="noreferrer">
              google-merchant.xml
            </a>
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="text-sm font-semibold mb-2">Site kontrolleri</h3>
        <ul className="space-y-2">
          {report.siteChecks.map((check) => (
            <li
              key={check.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--kn-border)] px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{check.label}</p>
                <p className="text-[var(--kn-muted)] text-xs mt-0.5">{check.detail}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${statusBadge(check.status)}`}>
                {statusText(check.status)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {report.products.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold mb-2">
            İyileştirme gereken ürünler ({report.productSummary.needsWorkCount})
          </h3>
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {report.products.map((product) => (
              <li
                key={product.id}
                className="rounded-lg border border-[var(--kn-border)] px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <a href={product.adminUrl} className="font-medium underline">
                    {product.title}
                  </a>
                  <span className={`font-semibold ${scoreColor(product.score)}`}>{product.score}%</span>
                </div>
                {product.issues.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-xs text-[var(--kn-muted)]">
                    {product.issues.map((issue) => (
                      <li key={issue.id}>• {issue.label}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-emerald-700">Tüm yayınlı ürünler GEO skorunda ≥80% — içerik tarafı iyi görünüyor.</p>
      )}

      <button
        type="button"
        onClick={() => void load()}
        className="rounded-lg border border-[var(--kn-border)] px-4 py-2 text-sm hover:bg-[var(--kn-bg)]"
      >
        Yenile
      </button>
    </section>
  );
}
