"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CronHealthPanel } from "@/components/admin/CronHealthPanel";
import {
  EVENT_LABELS,
  formatCartItemsPreview,
  formatEventDetail,
} from "@/lib/analytics/format-event";
import type { AnalyticsFunnel } from "@/lib/analytics/funnel";
import { formatTry } from "@/lib/format";

type Summary = {
  visitors7d: number;
  openAbandonments: number;
  recoveredWeek: number;
  events7d: Record<string, number>;
};

type EventRow = {
  id: string;
  eventType: string;
  visitorKey: string;
  customerId: string | null;
  payload: string;
  createdAt: string;
};

type AbandonRow = {
  id: string;
  visitorKey: string;
  customerEmail: string | null;
  customerName: string | null;
  cartValueMinor: number;
  itemCount: number;
  lastActivityAt: string;
  remindedAt: string | null;
  itemsJson?: string;
};

const ABANDON_FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "eligible", label: "Cron uygun (1–72 sa)" },
  { id: "not_reminded", label: "Hatırlatma yok" },
  { id: "no_email", label: "E-posta yok" },
] as const;

type AbandonFilter = (typeof ABANDON_FILTERS)[number]["id"];

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [abandonments, setAbandonments] = useState<AbandonRow[]>([]);
  const [abandonFilter, setAbandonFilter] = useState<AbandonFilter>("all");
  const [funnelDays, setFunnelDays] = useState(7);
  const [err, setErr] = useState<string | null>(null);
  const [remindBusy, setRemindBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    const q = new URLSearchParams({
      abandonFilter,
      funnelDays: String(funnelDays),
    });
    fetch(`/api/admin/analytics?${q}`)
      .then((r) => r.json())
      .then(
        (d: {
          summary?: Summary;
          funnel?: AnalyticsFunnel;
          recentEvents?: EventRow[];
          abandonments?: AbandonRow[];
          error?: string;
        }) => {
          if (d.error) setErr(d.error);
          else {
            setErr(null);
            setSummary(d.summary ?? null);
            setFunnel(d.funnel ?? null);
            setEvents(d.recentEvents ?? []);
            setAbandonments(d.abandonments ?? []);
          }
        },
      )
      .catch(() => setErr("Yüklenemedi"));
  }, [abandonFilter, funnelDays]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendRemind(id: string, force = false) {
    setRemindBusy(id);
    try {
      const res = await fetch(`/api/admin/analytics/abandonments/${id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = (await res.json()) as { error?: string; sent?: boolean; reason?: string };
      if (!res.ok) alert(data.error ?? "Gönderilemedi");
      else if (data.sent) alert(`E-posta gönderildi: ${(data as { email?: string }).email ?? ""}`);
      else alert(data.reason ?? "Gönderilmedi");
      load();
    } finally {
      setRemindBusy(null);
    }
  }

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!summary) return <p className="text-sm text-zinc-600">Yükleniyor…</p>;

  const funnelSteps = funnel
    ? [
        { label: "Sayfa görüntüleme", count: funnel.pageViews, visitors: funnel.visitorsWithPageView },
        { label: "Ürün görüntüleme", count: funnel.productViews, visitors: null },
        { label: "Sepete ekleme", count: funnel.addToCart, visitors: funnel.visitorsWithAddToCart },
        { label: "Ödemeye başlama", count: funnel.beginCheckout, visitors: funnel.visitorsWithCheckout },
        { label: "Satın alma", count: funnel.purchases, visitors: funnel.visitorsWithPurchase },
      ]
    : [];

  return (
    <div className="space-y-8">
      <CronHealthPanel />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/admin/abandoned-carts"
          className="font-medium text-blue-700 underline hover:text-blue-900"
        >
          Terk edilen sepetler →
        </Link>
        <span className="text-zinc-400">|</span>
        <Link
          href="/admin/analytics/visitors"
          className="font-medium text-blue-700 underline hover:text-blue-900"
        >
          Tüm ziyaretçiler →
        </Link>
        <span className="text-zinc-400">|</span>
        <a
          href={`/api/admin/analytics/export?kind=funnel&days=${funnelDays}`}
          className="text-zinc-700 underline"
        >
          Huni CSV
        </a>
        <a href="/api/admin/analytics/export?kind=abandonments" className="text-zinc-700 underline">
          Sepet terk CSV
        </a>
        <a
          href={`/api/admin/analytics/export?kind=events&days=${funnelDays}`}
          className="text-zinc-700 underline"
        >
          Olaylar CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ziyaretçi (7 gün)" value={String(summary.visitors7d)} />
        <StatCard label="Açık sepet terki" value={String(summary.openAbandonments)} />
        <StatCard label="Kurtarılan sepet (7 gün)" value={String(summary.recoveredWeek)} />
        <StatCard
          label="Ürün görüntüleme (7 gün)"
          value={String(summary.events7d.product_view ?? 0)}
        />
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Dönüşüm hunisi</h2>
          {[7, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFunnelDays(d)}
              className={`rounded-lg border px-3 py-1 text-sm ${
                funnelDays === d
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              {d} gün
            </button>
          ))}
        </div>
        {!funnelSteps.length ? (
          <p className="text-sm text-zinc-500">Huni verisi yok.</p>
        ) : (
          <div className="space-y-2">
            {funnelSteps.map((step, i) => {
              const prev = i > 0 ? funnelSteps[i - 1].visitors ?? funnelSteps[i - 1].count : null;
              const rate =
                prev && step.visitors != null && prev > 0
                  ? `${Math.round((step.visitors / prev) * 100)}%`
                  : null;
              return (
                <div
                  key={step.label}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-4 py-3 text-sm"
                >
                  <span className="font-medium">{step.label}</span>
                  <span className="text-zinc-600">
                    {step.count} olay
                    {step.visitors != null ? ` · ${step.visitors} ziyaretçi` : ""}
                    {rate ? ` · ${rate} (önceki adıma göre)` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Olay özeti (7 gün)</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.events7d).map(([k, v]) => (
            <span
              key={k}
              className="rounded-full border bg-white px-3 py-1 text-sm text-zinc-700"
            >
              {EVENT_LABELS[k as keyof typeof EVENT_LABELS] ?? k}: <strong>{v}</strong>
            </span>
          ))}
          {!Object.keys(summary.events7d).length ? (
            <p className="text-sm text-zinc-500">Henüz olay yok.</p>
          ) : null}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Açık sepet terkleri</h2>
          {ABANDON_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setAbandonFilter(f.id)}
              className={`rounded-lg border px-3 py-1 text-sm ${
                abandonFilter === f.id
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {!abandonments.length ? (
          <p className="text-sm text-zinc-500">Bu filtrede sepet terki yok.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-left">
                  <th className="p-3">Son aktivite</th>
                  <th className="p-3">Müşteri / ziyaretçi</th>
                  <th className="p-3">Ürünler</th>
                  <th className="p-3">Tutar</th>
                  <th className="p-3">Hatırlatma</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {abandonments.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(a.lastActivityAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="p-3">
                      <VisitorLink
                        visitorKey={a.visitorKey}
                        label={
                          a.customerName ?? a.customerEmail ?? `Anonim …${a.visitorKey.slice(-8)}`
                        }
                      />
                    </td>
                    <td className="p-3 max-w-xs text-zinc-700">
                      {a.itemsJson ? formatCartItemsPreview(a.itemsJson, 2) : "—"}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {formatTry(a.cartValueMinor)}
                      <span className="text-zinc-500"> · {a.itemCount} adet</span>
                    </td>
                    <td className="p-3">
                      {a.remindedAt
                        ? new Date(a.remindedAt).toLocaleDateString("tr-TR")
                        : a.customerEmail
                          ? "—"
                          : "E-posta yok"}
                    </td>
                    <td className="p-3">
                      {a.customerEmail ? (
                        <button
                          type="button"
                          disabled={remindBusy === a.id}
                          onClick={() => sendRemind(a.id, !!a.remindedAt)}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {remindBusy === a.id
                            ? "…"
                            : a.remindedAt
                              ? "Tekrar gönder"
                              : "Hatırlat"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Son olaylar</h2>
        {!events.length ? (
          <p className="text-sm text-zinc-500">Olay kaydı yok.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-left">
                  <th className="p-3">Tarih</th>
                  <th className="p-3">Olay</th>
                  <th className="p-3">Detay</th>
                  <th className="p-3">Ziyaretçi</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="p-3">
                      {EVENT_LABELS[e.eventType as keyof typeof EVENT_LABELS] ?? e.eventType}
                    </td>
                    <td className="p-3 text-zinc-800">
                      {formatEventDetail(e.eventType, e.payload)}
                    </td>
                    <td className="p-3">
                      <VisitorLink visitorKey={e.visitorKey} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function VisitorLink({
  visitorKey,
  label,
}: {
  visitorKey: string;
  label?: string | null;
}) {
  const href = `/admin/analytics/visitors/${encodeURIComponent(visitorKey)}`;
  const text = label?.trim() || `…${visitorKey.slice(-8)}`;
  return (
    <Link href={href} className="text-blue-700 hover:underline">
      {text}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
