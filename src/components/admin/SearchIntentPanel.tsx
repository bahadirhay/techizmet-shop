"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { SearchIntentReport } from "@/lib/admin/search-intent/scan";

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 55) return "text-amber-700";
  return "text-red-700";
}

function statusClass(status: string) {
  if (status === "pass") return "text-emerald-700";
  if (status === "warn") return "text-amber-700";
  return "text-red-700";
}

export function SearchIntentPanel() {
  const [reports, setReports] = useState<SearchIntentReport[]>([]);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/search-intent");
      if (!res.ok) throw new Error("Yüklenemedi");
      const data = (await res.json()) as { reports: SearchIntentReport[]; aiEnabled: boolean };
      if (seq !== loadSeq.current) return;
      setReports(data.reports);
      setAiEnabled(data.aiEnabled);
    } catch {
      if (seq !== loadSeq.current) return;
      setMsg("Hedef arama raporu alınamadı.");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(intentId: string, action: "apply-meta" | "fix-products" | "run-indexing") {
    setBusy(`${intentId}-${action}`);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/search-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId, action }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        scan?: { reports: SearchIntentReport[] };
        fix?: { succeeded?: number };
      };
      if (!res.ok) throw new Error(json.error ?? "İşlem başarısız");
      if (json.scan?.reports) {
        loadSeq.current += 1;
        setReports(json.scan.reports);
      }
      if (action === "apply-meta") setMsg("Landing meta uygulandı ve IndexNow tetiklendi.");
      else if (action === "fix-products") setMsg(`Ürün SEO güncellendi (${json.fix?.succeeded ?? 0} başarılı).`);
      else setMsg("Tam site indeksleme çalıştırıldı.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-sm text-[var(--kn-muted)]">Hedef aramalar taranıyor…</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--kn-muted)]">
        <strong className="font-medium text-[var(--kn-fg)]">{reports.length} hedef sorgu</strong> — öncelik:{" "}
        <strong>Köpek Ödül Maması</strong>, <strong>Ödül maması</strong>,{" "}
        <strong>Doğal Köpek Ödül Maması</strong>. Landing meta, FAQ schema, ürün listesi (ItemList) ve Merchant
        feed birlikte çalışır. Sıra takibi için{" "}
        <Link href="/admin/settings/google-ranking" className="underline">
          Google Sıralama
        </Link>{" "}
        panelini kullanın.
      </p>

      {!aiEnabled ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ürün meta uzatma için{" "}
          <Link href="/admin/settings/seo-ai" className="underline">
            SEO AI
          </Link>{" "}
          anahtarı gerekir.
        </p>
      ) : null}

      {msg ? <p className="text-sm">{msg}</p> : null}

      {reports.map((report) => (
        <section
          key={report.intent.id}
          className="rounded-xl border border-[var(--kn-border)] bg-[var(--kn-surface)] p-5 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-[var(--kn-muted)] uppercase tracking-wide">Hedef sorgu</p>
              <h3 className="text-lg font-semibold">&quot;{report.intent.query}&quot;</h3>
              <p className="text-sm text-[var(--kn-muted)] mt-1">
                Landing:{" "}
                <a href={report.intent.landingPath} className="underline" target="_blank" rel="noreferrer">
                  {report.intent.landingPath}
                </a>
                {" · "}
                {report.matchingProducts}/{report.publishedProducts} ürün eşleşiyor
              </p>
            </div>
            <p className={`text-2xl font-semibold ${scoreTone(report.score)}`}>{report.score}%</p>
          </div>

          <ul className="space-y-2 text-sm">
            {report.checks.map((check) => (
              <li key={check.id} className="flex justify-between gap-3 border-b border-[var(--kn-border)] pb-2">
                <div>
                  <p className="font-medium">{check.label}</p>
                  <p className="text-xs text-[var(--kn-muted)]">{check.detail}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium ${statusClass(check.status)}`}>
                  {check.status === "pass" ? "Tamam" : check.status === "warn" ? "İyileştir" : "Eksik"}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={!!busy}
              onClick={() => void runAction(report.intent.id, "apply-meta")}
            >
              {busy === `${report.intent.id}-apply-meta` ? "…" : "Landing meta uygula"}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={!!busy || !aiEnabled}
              onClick={() => void runAction(report.intent.id, "fix-products")}
            >
              {busy === `${report.intent.id}-fix-products` ? "…" : "Ürün meta uzat (AI)"}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={!!busy}
              onClick={() => void runAction(report.intent.id, "run-indexing")}
            >
              {busy === `${report.intent.id}-run-indexing` ? "…" : "IndexNow gönder"}
            </button>
          </div>

          {report.intent.suggestedBlogTitle ? (
            <p className="text-xs text-[var(--kn-muted)]">
              Blog önerisi: &quot;{report.intent.suggestedBlogTitle}&quot; —{" "}
              <Link href="/admin/blog/automation" className="underline">
                Blog otomasyon
              </Link>
            </p>
          ) : null}
        </section>
      ))}

      <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void load()}>
        Yenile
      </button>
    </div>
  );
}
