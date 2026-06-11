"use client";

import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { SiteSeoAuditResult } from "@/lib/admin/site-seo/types";

function statusClass(status: string) {
  if (status === "ok") return "text-green-700";
  if (status === "warn") return "text-amber-700";
  return "text-red-700";
}

export function SiteSeoAuditPanel() {
  const [audit, setAudit] = useState<SiteSeoAuditResult | null>(null);
  const [busy, setBusy] = useState<"audit" | "optimize" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function runAudit() {
    setBusy("audit");
    setMsg(null);
    const res = await fetch("/api/admin/site-seo/audit");
    const j = (await res.json()) as SiteSeoAuditResult & { error?: string };
    setBusy(null);
    if (!res.ok) {
      setMsg(j.error ?? "Analiz başarısız");
      return;
    }
    setAudit(j);
  }

  async function runOptimize() {
    setBusy("optimize");
    setMsg(null);
    const res = await fetch("/api/admin/site-seo/optimize", { method: "POST" });
    const j = (await res.json()) as {
      updated?: number;
      pages?: { path: string; seoTitle: string }[];
      error?: string;
    };
    setBusy(null);
    if (!res.ok) {
      setMsg(j.error ?? "Optimizasyon başarısız");
      return;
    }
    const home = j.pages?.find((p) => p.path === "/");
    setMsg(
      `${j.updated ?? 0} sayfa güncellendi.${home ? ` Ana sayfa meta başlık: ${home.seoTitle.length} karakter.` : ""} Analiz yenileniyor…`,
    );
    await runAudit();
  }

  return (
    <section className="admin-card admin-card-pad space-y-4">
      <h2 className="text-lg font-semibold">Site geneli SEO analizi</h2>
      <p className="text-sm text-zinc-600">
        Ürün sayfaları hariç tüm vitrin sayfalarını (ana sayfa, koleksiyonlar, CMS sayfaları, blog)
        tarar. Meta başlık, açıklama ve görsel alt metinlerini önerir veya tek tıkla doldurur.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void runAudit()}>
          {busy === "audit" ? "Analiz ediliyor…" : "Sayfaları analiz et"}
        </button>
        <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => void runOptimize()}>
          {busy === "optimize" ? "Uygulanıyor…" : "SEO alanlarını otomatik doldur"}
        </button>
      </div>
      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
      {audit ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            {audit.summary.total} sayfa —{" "}
            <span className="text-green-700">{audit.summary.ok} uygun</span>,{" "}
            <span className="text-amber-700">{audit.summary.warn} uyarı</span>,{" "}
            <span className="text-red-700">{audit.summary.fail} eksik</span>
          </p>
          <div className="max-h-[28rem] overflow-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Sayfa</th>
                  <th className="px-3 py-2">Skor</th>
                  <th className="px-3 py-2">Durum</th>
                </tr>
              </thead>
              <tbody>
                {audit.pages.map((page) => (
                  <tr key={page.id} className="border-t align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">{page.title}</div>
                      <div className="text-xs text-zinc-500">{page.path}</div>
                    </td>
                    <td className="px-3 py-2">{page.score}%</td>
                    <td className="px-3 py-2">
                      <ul className="space-y-1 text-xs">
                        {page.items.map((item) => (
                          <li key={item.id} className={statusClass(item.status)}>
                            <strong>{item.label}:</strong> {item.detail}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
