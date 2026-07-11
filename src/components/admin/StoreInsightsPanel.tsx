"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type StoreInsightRow = {
  id: string;
  channel: string;
  category: string;
  severity: string;
  title: string;
  detail: string;
  actionType: string;
  status: string;
  executionError: string | null;
  createdAt: string;
  decidedAt: string | null;
};

const btn = "rounded-md px-3 py-1.5 text-sm font-medium transition";
const btnPrimary = `${btn} bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50`;
const btnSecondary = `${btn} border border-zinc-300 bg-white hover:border-zinc-400 disabled:opacity-50`;
const btnDanger = `${btn} border border-red-300 text-red-700 bg-white hover:border-red-400 disabled:opacity-50`;

const CHANNEL_LABEL: Record<string, string> = {
  trendyol: "Trendyol",
  amazon: "Amazon",
  instagram: "Instagram",
  general: "Genel",
};

const SEVERITY_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "Yüksek öncelik", cls: "bg-red-100 text-red-700" },
  medium: { label: "Orta öncelik", cls: "bg-amber-100 text-amber-800" },
  low: { label: "Düşük öncelik", cls: "bg-zinc-100 text-zinc-600" },
};

const CATEGORY_LINK: Record<string, { label: string; href: string }> = {
  qna: { label: "Trendyol Soru-Cevap panelini aç", href: "/admin/integrations?platform=trendyol" },
  listing: { label: "Ürünlere git", href: "/admin/products" },
  pricing: { label: "Ürünlere git", href: "/admin/products" },
  stock: { label: "Ürünlere git", href: "/admin/products" },
};

function severityBadge(severity: string) {
  return SEVERITY_BADGE[severity] ?? SEVERITY_BADGE.medium!;
}

export function StoreInsightsPanel({ initialInsights }: { initialInsights: StoreInsightRow[] }) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = initialInsights.filter((i) => i.status === "pending");
  const history = initialInsights.filter((i) => i.status !== "pending");

  async function runAnalyze() {
    setAnalyzing(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/integrations/marketplaces/insights/analyze", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      setMsg(json.message ?? (json.ok ? "Analiz tamamlandı" : "Analiz başarısız"));
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Analiz başarısız");
    } finally {
      setAnalyzing(false);
    }
  }

  async function decide(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/integrations/marketplaces/insights/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      setMsg(json.message ?? json.error ?? (json.ok ? "Kaydedildi" : "İşlem başarısız"));
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            {pending.length} bekleyen öneri
          </p>
          <p className="text-xs text-zinc-500">
            Analiz son 30 günün Trendyol/Amazon sipariş-ilan verisi ve Instagram içerik kapsamına bakar.
          </p>
        </div>
        <button className={btnPrimary} onClick={runAnalyze} disabled={analyzing}>
          {analyzing ? "Analiz ediliyor…" : "Şimdi Analiz Et"}
        </button>
      </div>

      {msg ? (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">{msg}</div>
      ) : null}

      {pending.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Bekleyen öneri yok. &quot;Şimdi Analiz Et&quot; ile yeni bir analiz çalıştırabilirsiniz.
        </p>
      ) : (
        <div className="space-y-3">
          {pending.map((row) => {
            const sev = severityBadge(row.severity);
            const link = CATEGORY_LINK[row.category];
            const isActionable = row.actionType === "instagram_post";
            return (
              <div key={row.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {CHANNEL_LABEL[row.channel] ?? row.channel}
                  </span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${sev.cls}`}>{sev.label}</span>
                </div>
                <p className="text-sm font-semibold text-zinc-900">{row.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{row.detail}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isActionable ? (
                    <>
                      <button
                        className={btnPrimary}
                        disabled={busyId === row.id}
                        onClick={() => decide(row.id, "approve")}
                      >
                        {busyId === row.id ? "Yayınlanıyor…" : "Onayla ve Instagram'da yayınla"}
                      </button>
                      <button
                        className={btnSecondary}
                        disabled={busyId === row.id}
                        onClick={() => decide(row.id, "reject")}
                      >
                        Reddet
                      </button>
                    </>
                  ) : (
                    <>
                      {link ? (
                        <a className={btnSecondary} href={link.href}>
                          {link.label}
                        </a>
                      ) : null}
                      <button
                        className={btnDanger}
                        disabled={busyId === row.id}
                        onClick={() => decide(row.id, "reject")}
                      >
                        Kapat
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 ? (
        <details className="rounded-lg border border-zinc-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-700">
            Geçmiş ({history.length})
          </summary>
          <div className="mt-3 space-y-2">
            {history.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 border-t border-zinc-100 pt-2 text-sm">
                <div>
                  <p className="font-medium text-zinc-800">{row.title}</p>
                  {row.status === "failed" && row.executionError ? (
                    <p className="text-xs text-red-600">{row.executionError}</p>
                  ) : null}
                </div>
                <span className="whitespace-nowrap rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
