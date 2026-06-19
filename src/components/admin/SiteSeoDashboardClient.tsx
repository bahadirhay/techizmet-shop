"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { SeoDashboardFixResult, SeoDashboardScan } from "@/lib/admin/seo-dashboard/types";

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-red-700";
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

export function SiteSeoDashboardClient() {
  const [scan, setScan] = useState<SeoDashboardScan | null>(null);
  const [busy, setBusy] = useState<"scan" | "fix" | null>(null);
  const [fixTarget, setFixTarget] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastFix, setLastFix] = useState<SeoDashboardFixResult | null>(null);

  const loadScan = useCallback(async () => {
    setBusy("scan");
    setMsg(null);
    const res = await fetch("/api/admin/seo-dashboard");
    const j = (await res.json()) as SeoDashboardScan & { error?: string };
    setBusy(null);
    if (!res.ok) {
      setMsg(j.error ?? "Tarama başarısız");
      return;
    }
    setScan(j);
  }, []);

  useEffect(() => {
    void loadScan();
  }, [loadScan]);

  async function runFix(target: "pages" | "products" | "image-alts" | "all") {
    setBusy("fix");
    setFixTarget(target);
    setMsg(null);
    setLastFix(null);

    const allDetails: string[] = [];
    const allErrors: string[] = [];
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;

    async function runBatch(batchTarget: "pages" | "products" | "image-alts") {
      const res = await fetch("/api/admin/seo-dashboard/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: batchTarget, limit: 5 }),
      });
      const j = (await res.json()) as SeoDashboardFixResult & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Düzeltme başarısız");
      totalProcessed += j.processed;
      totalSucceeded += j.succeeded;
      totalFailed += j.failed;
      allDetails.push(...j.details);
      allErrors.push(...j.errors);
      return j;
    }

    try {
      if (target === "all" || target === "pages") {
        await runBatch("pages");
      }

      const batchTargets: ("products" | "image-alts")[] =
        target === "all" ? ["products", "image-alts"] : target === "products" || target === "image-alts" ? [target] : [];

      for (const batchTarget of batchTargets) {
        let batch = 0;
        let remaining = 1;
        while (remaining > 0 && batch < 40) {
          batch += 1;
          const j = await runBatch(batchTarget);
          remaining = j.remaining;
          if (j.processed === 0) break;
        }
      }

      setLastFix({
        target,
        processed: totalProcessed,
        succeeded: totalSucceeded,
        failed: totalFailed,
        remaining: 0,
        errors: allErrors,
        details: allDetails,
      });
      setMsg(
        `${totalProcessed} işlem tamamlandı (${totalSucceeded} başarılı${totalFailed ? `, ${totalFailed} hata` : ""}).`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Düzeltme başarısız");
    }

    setBusy(null);
    setFixTarget(null);
    await loadScan();
  }

  const dist = scan?.distribution;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void loadScan()}>
          {busy === "scan" ? "Taranıyor…" : "Yeniden tara"}
        </button>
        <button
          type="button"
          className={btnPrimary}
          disabled={!!busy || !scan?.aiEnabled}
          onClick={() => void runFix("all")}
        >
          {busy === "fix" && fixTarget === "all" ? "Claude ile düzeltiliyor…" : "Tümünü düzelt (AI)"}
        </button>
        <Link href="/admin/settings/distribution" className={btnSecondary}>
          İndeksleme paneli
        </Link>
        <Link href="/admin/settings/seo-ai" className={btnSecondary}>
          SEO AI ayarları
        </Link>
      </div>

      {!scan?.aiEnabled ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Claude / Gemini API anahtarı tanımlı değil veya SEO AI kapalı.{" "}
          <Link href="/admin/settings/seo-ai" className="underline">
            SEO AI ayarları
          </Link>{" "}
          sayfasından etkinleştirin.
        </p>
      ) : null}

      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}

      {lastFix?.details.length ? (
        <details className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">Son işlem detayları</summary>
          <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-auto pl-5 text-xs text-zinc-600">
            {lastFix.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          {lastFix.errors.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-600">
              {lastFix.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </details>
      ) : null}

      {scan ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Sayfa SEO ort."
              value={`${scan.summary.pages.avgScore}%`}
              hint={`${scan.summary.pages.total} sayfa`}
              tone={scoreTone(scan.summary.pages.avgScore)}
            />
            <Kpi
              label="Ürün SEO ort."
              value={`${scan.summary.products.avgScore}%`}
              hint={`${scan.summary.products.published} yayında / ${scan.summary.products.total} toplam`}
              tone={scoreTone(scan.summary.products.avgScore)}
            />
            <Kpi
              label="Eksik meta"
              value={scan.summary.products.missingMeta}
              hint="SEO başlık veya açıklama zayıf"
              tone={scan.summary.products.missingMeta ? "text-amber-700" : "text-emerald-700"}
            />
            <Kpi
              label="Eksik görsel alt"
              value={scan.summary.products.missingImageAlts}
              hint="Google Görsel Arama için"
              tone={scan.summary.products.missingImageAlts ? "text-amber-700" : "text-emerald-700"}
            />
          </div>

          <section className="admin-card admin-card-pad space-y-3">
            <h2 className="text-lg font-semibold">İndeksleme durumu</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">Son tam tarama</dt>
                <dd>{dist?.lastFullIndexAt ? new Date(dist.lastFullIndexAt).toLocaleString("tr-TR") : "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Son IndexNow</dt>
                <dd>{dist?.lastIndexNowAt ? new Date(dist.lastIndexNowAt).toLocaleString("tr-TR") : "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">AI sağlayıcı</dt>
                <dd>
                  {[
                    scan.aiProviders.claude && "Claude",
                    scan.aiProviders.gemini && "Gemini",
                    scan.aiProviders.openai && "OpenAI",
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="admin-card admin-card-pad space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Hızlı düzeltme</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={!!busy}
                  onClick={() => void runFix("pages")}
                >
                  {busy === "fix" && fixTarget === "pages" ? "…" : `Sayfalar (${scan.summary.pages.fail + scan.summary.pages.warn} uyarı)`}
                </button>
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={!!busy}
                  onClick={() => void runFix("products")}
                >
                  {busy === "fix" && fixTarget === "products"
                    ? "…"
                    : `Ürünler (${scan.productQueue.needsSeoFix})`}
                </button>
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={!!busy}
                  onClick={() => void runFix("image-alts")}
                >
                  {busy === "fix" && fixTarget === "image-alts"
                    ? "…"
                    : `Görsel alt (${scan.productQueue.needsImageAlts})`}
                </button>
              </div>
            </div>
            <p className="text-sm text-zinc-600">
              Ürün düzeltmeleri her seferinde 5&apos;erli batch çalışır; kuyruk bitene kadar otomatik devam eder.
            </p>
          </section>

          <section className="admin-card admin-card-pad space-y-3">
            <h2 className="text-lg font-semibold">En zayıf ürünler</h2>
            <div className="max-h-[24rem] overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Ürün</th>
                    <th className="px-3 py-2">Skor</th>
                    <th className="px-3 py-2">Görsel alt</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {scan.products.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-zinc-500">
                        Yayında zayıf ürün yok.
                      </td>
                    </tr>
                  ) : (
                    scan.products.map((p) => (
                      <tr key={p.id} className="border-t align-top">
                        <td className="px-3 py-2">
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-zinc-500">/products/{p.slug}</div>
                          {p.issues.length ? (
                            <ul className="mt-1 text-xs text-amber-800">
                              {p.issues.slice(0, 3).map((i) => (
                                <li key={i}>{i}</li>
                              ))}
                            </ul>
                          ) : null}
                        </td>
                        <td className={`px-3 py-2 font-medium ${scoreTone(p.score)}`}>{p.score}%</td>
                        <td className="px-3 py-2 text-xs text-zinc-600">
                          {p.missingImageAlts > 0
                            ? `${p.missingImageAlts}/${p.imageCount} eksik`
                            : p.imageCount
                              ? "Tamam"
                              : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="text-[var(--kn-brand)] underline text-xs"
                          >
                            Düzenle
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-card admin-card-pad space-y-3">
            <h2 className="text-lg font-semibold">Vitrin sayfaları</h2>
            <p className="text-sm text-zinc-600">
              <span className="text-green-700">{scan.pages.summary.ok} uygun</span>,{" "}
              <span className="text-amber-700">{scan.pages.summary.warn} uyarı</span>,{" "}
              <span className="text-red-700">{scan.pages.summary.fail} eksik</span>
            </p>
            <div className="max-h-64 overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">Sayfa</th>
                    <th className="px-3 py-2">Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {scan.pages.pages
                    .filter((p) => p.score < 85)
                    .slice(0, 20)
                    .map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{p.title}</div>
                          <div className="text-xs text-zinc-500">{p.path}</div>
                        </td>
                        <td className={`px-3 py-2 ${scoreTone(p.score)}`}>{p.score}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : busy !== "scan" ? (
        <p className="text-sm text-zinc-500">Veri yüklenemedi.</p>
      ) : (
        <p className="text-sm text-zinc-500">Site taranıyor…</p>
      )}
    </div>
  );
}
