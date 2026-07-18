"use client";

import { useEffect, useState } from "react";
import type { CronHealthSnapshot, CronJobId, CronRunRecord } from "@/lib/cron-health";

const JOB_LABELS: Record<CronJobId, string> = {
  cartAbandonmentRemind: "Sepet terk hatırlatma",
  marketplaceOrders: "Pazar yeri sipariş çekme",
  marketplaceInventory: "Pazar yeri stok/fiyat senkronu",
  ordersAutoDeliver: "Kargoda kalan siparişleri teslim edildi yapma",
  blogAutomation: "Blog otomasyonu",
  gscSync: "GSC arama senkronu",
  seoDistribution: "SEO indeksleme (IndexNow + sitemap)",
  socialPublish: "Sosyal içerik zamanlanmış yayın",
  trendyolQna: "Trendyol soru-cevap otomasyonu",
};

function statusTone(record: CronRunRecord | undefined, stale: boolean) {
  if (!record) return "text-zinc-500";
  if (!record.ok) return "text-red-600";
  if (stale) return "text-amber-700";
  return "text-green-700";
}

export function CronHealthPanel() {
  const [health, setHealth] = useState<CronHealthSnapshot | null>(null);
  const [stale, setStale] = useState<Partial<Record<CronJobId, boolean>>>({});

  useEffect(() => {
    fetch("/api/admin/cron-health")
      .then((r) => r.json())
      .then(
        (d: CronHealthSnapshot & {
          error?: string;
          stale?: Partial<Record<import("@/lib/cron-health").CronJobId, boolean>>;
        }) => {
          if (!d.error) {
            setHealth(d);
            setStale(d.stale ?? {});
          }
        },
      )
      .catch(() => {});
  }, []);

  if (!health) return null;

  const jobs: CronJobId[] = [
    "cartAbandonmentRemind",
    "marketplaceOrders",
    "ordersAutoDeliver",
    "blogAutomation",
    "gscSync",
    "seoDistribution",
    "socialPublish",
    "trendyolQna",
  ];

  return (
    <section className="admin-card admin-card-pad">
      <h2 className="text-lg font-semibold">Zamanlanmış görevler (cron)</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {health.secretConfigured
          ? "CRON_SECRET tanımlı — Windows Görev Zamanlayıcı veya harici cron endpoint'i çağırabilir (Vercel Hobby saatlik cron desteklemez)."
          : "CRON_SECRET eksik — otomatik görevler çalışmaz."}
      </p>
      <ul className="mt-4 space-y-3">
        {jobs.map((id) => {
          const record = health.jobs[id];
          const isStale = stale[id];
          return (
            <li key={id} className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-zinc-900">{JOB_LABELS[id]}</span>
                <span className={`text-xs font-medium ${statusTone(record, !!isStale)}`}>
                  {!record
                    ? "Henüz çalışmadı"
                    : !record.ok
                      ? "Son çalışma hatalı"
                      : isStale
                        ? "Gecikmiş olabilir"
                        : "Sağlıklı"}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{health.schedules[id]}</p>
              {record ? (
                <p className="mt-2 text-xs text-zinc-600">
                  Son: {new Date(record.lastRunAt).toLocaleString("tr-TR")}
                  {record.durationMs != null ? ` · ${record.durationMs} ms` : ""}
                  {record.summary
                    ? ` · ${Object.entries(record.summary)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}`
                    : ""}
                  {record.error ? (
                    <span className="block text-red-600">Hata: {record.error}</span>
                  ) : null}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
