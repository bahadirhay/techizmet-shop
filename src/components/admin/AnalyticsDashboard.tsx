"use client";

import { useEffect, useState } from "react";
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
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "Sayfa görüntüleme",
  product_view: "Ürün görüntüleme",
  add_to_cart: "Sepete ekleme",
  begin_checkout: "Ödeme başlangıcı",
  purchase: "Satın alma",
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
              {EVENT_LABELS[k] ?? k}: <strong>{v}</strong>
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
                  <th className="p-3">Müşteri</th>
                  <th className="p-3">Tutar</th>
                  <th className="p-3">Adet</th>
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
                      {a.customerName ?? a.customerEmail ?? `…${a.visitorKey}`}
                    </td>
                    <td className="p-3">{formatTry(a.cartValueMinor)}</td>
                    <td className="p-3">{a.itemCount}</td>
                    <td className="p-3">
                      {a.remindedAt
                        ? new Date(a.remindedAt).toLocaleDateString("tr-TR")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Hatırlatma e-postası: cron{" "}
          <code className="rounded bg-zinc-100 px-1">/api/cron/cart-abandonment/remind</code> — üye
          e-postası olan terk sepetler, 1–72 saat arası.
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
                  <th className="p-3">Ziyaretçi</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="p-3">{EVENT_LABELS[e.eventType] ?? e.eventType}</td>
                    <td className="p-3 font-mono text-xs">{e.visitorKey}…</td>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
