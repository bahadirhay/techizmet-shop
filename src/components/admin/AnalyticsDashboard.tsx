"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EVENT_LABELS,
  formatCartItemsPreview,
  formatEventDetail,
} from "@/lib/analytics/format-event";
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

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [abandonments, setAbandonments] = useState<AbandonRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(
        (d: {
          summary?: Summary;
          recentEvents?: EventRow[];
          abandonments?: AbandonRow[];
          error?: string;
        }) => {
          if (d.error) setErr(d.error);
          else {
            setSummary(d.summary ?? null);
            setEvents(d.recentEvents ?? []);
            setAbandonments(d.abandonments ?? []);
          }
        },
      )
      .catch(() => setErr("Yüklenemedi"));
  }, []);

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!summary) return <p className="text-sm text-zinc-600">Yükleniyor…</p>;

  return (
    <div className="space-y-8">
      <p className="text-sm">
        <Link
          href="/admin/analytics/visitors"
          className="font-medium text-blue-700 underline hover:text-blue-900"
        >
          Tüm ziyaretçileri listele →
        </Link>
        <span className="text-zinc-500">
          {" "}
          (kim ne gezdi, sepet detayı, e-posta ile gruplama)
        </span>
      </p>

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
        <h2 className="mb-2 text-lg font-semibold">Açık sepet terkleri</h2>
        {!abandonments.length ? (
          <p className="text-sm text-zinc-500">Açık sepet terki yok.</p>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Hatırlatma e-postası: cron{" "}
          <code className="rounded bg-zinc-100 px-1">/api/cron/cart-abandonment/remind</code> —
          yalnızca üye e-postası olan terk sepetler, 1–72 saat sonra.
        </p>
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
