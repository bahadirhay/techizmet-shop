"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DistributionChecklistItem,
  DistributionPlatform,
  SiteDistributionSettings,
} from "@/lib/seo/distribution-types";

type DistributionPayload = {
  siteUrl: string;
  sitemapUrl: string;
  feedUrl: string;
  llmsTxtUrl: string;
  productsJsonUrl: string;
  indexNowKey: string;
  indexNowKeyFileUrl: string;
  distribution: SiteDistributionSettings;
  platforms: DistributionPlatform[];
  categoryLabels: Record<string, string>;
};

type RunResult = {
  indexNowKey?: string;
  keyFileUrl?: string;
  sitemapUrl?: string;
  feedUrl?: string;
  discoveryFeeds?: string[];
  sitemapPing?: { bing?: { ok: boolean }; yandex?: { ok: boolean } };
  indexNow?: { ok: boolean; submitted: number; batches: number; error?: string };
  errors?: string[];
};

function statusLabel(status?: DistributionChecklistItem["status"]) {
  switch (status) {
    case "done":
      return "Tamamlandı";
    case "auto":
      return "Otomatik";
    case "skipped":
      return "Atlandı";
    default:
      return "Bekliyor";
  }
}

function statusClass(status?: DistributionChecklistItem["status"]) {
  switch (status) {
    case "done":
    case "auto":
      return "text-emerald-700 bg-emerald-50";
    case "skipped":
      return "text-amber-700 bg-amber-50";
    default:
      return "text-slate-600 bg-slate-100";
  }
}

export function SiteDistributionPanel() {
  const [data, setData] = useState<DistributionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/distribution");
      if (!res.ok) throw new Error("Yüklenemedi");
      setData((await res.json()) as DistributionPayload);
    } catch {
      setMessage("Dağıtım verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, DistributionPlatform[]>();
    for (const p of data.platforms) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()];
  }, [data]);

  async function runIndexing() {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-indexing" }),
      });
      const json = (await res.json()) as { ok?: boolean; result?: RunResult; distribution?: SiteDistributionSettings };
      setLastRun(json.result ?? null);
      if (data && json.distribution) {
        setData({ ...data, distribution: json.distribution });
      }
      if (json.ok) {
        setMessage(
          `IndexNow: ${json.result?.indexNow?.submitted ?? 0} URL gönderildi (Bing + Yandex). Sitemap IndexNow ile bildirildi.`,
        );
      } else {
        setMessage(json.result?.errors?.join(" · ") || "Bazı adımlar başarısız oldu.");
      }
    } catch {
      setMessage("Otomatik indeksleme çalıştırılamadı.");
    } finally {
      setRunning(false);
    }
  }

  async function markPlatform(platformId: string, action: "mark-done" | "mark-skipped") {
    const res = await fetch("/api/admin/distribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, platformId }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { distribution?: SiteDistributionSettings };
    if (data && json.distribution) {
      setData({ ...data, distribution: json.distribution });
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--kn-muted)]">Yükleniyor…</p>;
  }

  if (!data) {
    return <p className="text-sm text-red-600">{message ?? "Veri yok"}</p>;
  }

  const checklist = data.distribution.checklist ?? {};

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[var(--kn-border)] bg-[var(--kn-surface)] p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Otomatik indeksleme</h2>
          <p className="text-sm text-[var(--kn-muted)] mt-1">
            IndexNow (Bing/Yandex/Seznam) ile anlık bildirim; sitemap, RSS, llms.txt ve JSON katalog.
            Ürün/blog yayınında anlık IndexNow tetiklenir. Günlük tam tarama: Vercel cron (05:30 TR) veya
            aşağıdaki buton.
          </p>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--kn-muted)]">Site</dt>
            <dd>
              <a href={data.siteUrl} className="underline" target="_blank" rel="noreferrer">
                {data.siteUrl}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--kn-muted)]">Sitemap</dt>
            <dd>
              <a href={data.sitemapUrl} className="underline" target="_blank" rel="noreferrer">
                sitemap.xml
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--kn-muted)]">RSS</dt>
            <dd>
              <a href={data.feedUrl} className="underline" target="_blank" rel="noreferrer">
                feed.xml
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--kn-muted)]">llms.txt</dt>
            <dd>
              <a href={data.llmsTxtUrl} className="underline" target="_blank" rel="noreferrer">
                llms.txt
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--kn-muted)]">JSON katalog</dt>
            <dd>
              <a href={data.productsJsonUrl} className="underline" target="_blank" rel="noreferrer">
                products.json
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--kn-muted)]">IndexNow anahtarı</dt>
            <dd>
              <a href={data.indexNowKeyFileUrl} className="underline font-mono text-xs" target="_blank" rel="noreferrer">
                indexnow-key.txt
              </a>
            </dd>
          </div>
        </dl>
        {data.distribution.lastFullIndexAt ? (
          <p className="text-xs text-[var(--kn-muted)]">
            Son tam indeksleme: {new Date(data.distribution.lastFullIndexAt).toLocaleString("tr-TR")}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => void runIndexing()}
          disabled={running}
          className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {running ? "Gönderiliyor…" : "Otomatik indekslemeyi başlat"}
        </button>
        {message ? <p className="text-sm">{message}</p> : null}
        {lastRun?.indexNow?.error ? (
          <p className="text-sm text-amber-700">{lastRun.indexNow.error}</p>
        ) : null}
      </section>

      {grouped.map(([category, platforms]) => (
        <section key={category} className="space-y-3">
          <h2 className="text-base font-semibold">
            {data.categoryLabels[category] ?? category}
          </h2>
          <ul className="space-y-3">
            {platforms.map((platform) => {
              const item = checklist[platform.id];
              return (
                <li
                  key={platform.id}
                  className="rounded-xl border border-[var(--kn-border)] bg-[var(--kn-surface)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{platform.label}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(item?.status)}`}>
                          {statusLabel(item?.status)}
                        </span>
                        {platform.automated ? (
                          <span className="text-xs text-[var(--kn-muted)]">(otomatik)</span>
                        ) : null}
                      </div>
                      <p className="text-sm text-[var(--kn-muted)] mt-1">{platform.description}</p>
                      {platform.steps?.length ? (
                        <ol className="mt-2 list-decimal pl-5 text-sm space-y-1">
                          {platform.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      ) : null}
                      {item?.notes ? (
                        <p className="text-xs text-[var(--kn-muted)] mt-2">{item.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {platform.actionUrl ? (
                        <a
                          href={platform.actionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-[var(--kn-border)] px-3 py-1.5 text-sm hover:bg-[var(--kn-bg)]"
                        >
                          Siteye git
                        </a>
                      ) : null}
                      {!platform.automated ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void markPlatform(platform.id, "mark-done")}
                            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-sm text-emerald-800 hover:bg-emerald-50"
                          >
                            Tamamlandı
                          </button>
                          <button
                            type="button"
                            onClick={() => void markPlatform(platform.id, "mark-skipped")}
                            className="rounded-lg border border-[var(--kn-border)] px-3 py-1.5 text-sm hover:bg-[var(--kn-bg)]"
                          >
                            Atla
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
