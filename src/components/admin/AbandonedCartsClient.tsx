"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatCartItemsPreview } from "@/lib/analytics/format-event";
import { formatTry } from "@/lib/format";

type Summary = {
  openCount: number;
  checkoutCount: number;
  recoveredWeek: number;
};

type AbandonedRow = {
  id: string;
  visitorKey: string;
  stage: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string | null;
  cartValueMinor: number;
  itemCount: number;
  lastActivityAt: string;
  remindedAt: string | null;
  whatsappRemindedAt: string | null;
  notes: string | null;
  itemsJson: string;
  hasCustomerAccount: boolean;
};

const FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "checkout", label: "Ödeme adımı" },
  { id: "has_contact", label: "İletişim var" },
  { id: "eligible", label: "E-posta hatırlat (1+ sa)" },
  { id: "no_contact", label: "İletişim yok" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

export function AbandonedCartsClient() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<AbandonedRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch(`/api/admin/abandoned-carts?filter=${filter}`)
      .then((r) => r.json())
      .then(
        (d: {
          summary?: Summary;
          rows?: AbandonedRow[];
          error?: string;
        }) => {
          if (d.error) setErr(d.error);
          else {
            setErr(null);
            setSummary(d.summary ?? null);
            setRows(d.rows ?? []);
          }
        },
      )
      .catch(() => setErr("Yüklenemedi"));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendEmail(id: string, force = false) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/abandoned-carts/${id}/remind-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = (await res.json()) as { error?: string; sent?: boolean; reason?: string; email?: string };
      if (!res.ok) alert(data.error ?? "Gönderilemedi");
      else if (data.sent) alert(`E-posta gönderildi: ${data.email ?? ""}`);
      else alert(data.reason ?? "Gönderilmedi");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function openWhatsapp(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/abandoned-carts/${id}/remind-whatsapp`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; waUrl?: string };
      if (!res.ok) {
        alert(data.error ?? "WhatsApp açılamadı");
        return;
      }
      if (data.waUrl) window.open(data.waUrl, "_blank", "noopener,noreferrer");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function saveNotes(id: string) {
    const notes = noteDraft[id] ?? "";
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/abandoned-carts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Kaydedilemedi");
        return;
      }
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(id: string) {
    if (!confirm("Bu sepet terkini listeden kapatmak istiyor musunuz?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/abandoned-carts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss: true }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Kapatılamadı");
        return;
      }
      load();
    } finally {
      setBusyId(null);
    }
  }

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!summary) return <p className="text-sm text-zinc-600">Yükleniyor…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Açık terk edilen sepet" value={String(summary.openCount)} />
        <StatCard label="Ödeme adımında" value={String(summary.checkoutCount)} />
        <StatCard label="Kurtarılan (7 gün)" value={String(summary.recoveredWeek)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg border px-3 py-1 text-sm ${
              filter === f.id
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-sm text-zinc-500">Manuel hatırlatma — e-posta veya WhatsApp</span>
      </div>

      {!rows.length ? (
        <p className="text-sm text-zinc-500">Bu filtrede terk edilmiş sepet yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left">
                <th className="p-3">Son aktivite</th>
                <th className="p-3">Aşama</th>
                <th className="p-3">Müşteri</th>
                <th className="p-3">Ürünler</th>
                <th className="p-3">Tutar</th>
                <th className="p-3">Hatırlatma</th>
                <th className="p-3">Not</th>
                <th className="p-3">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const busy = busyId === row.id;
                const noteValue = noteDraft[row.id] ?? row.notes ?? "";
                const displayName =
                  row.customerName ??
                  row.customerEmail ??
                  row.customerPhone ??
                  `Anonim …${row.visitorKey.slice(-8)}`;

                return (
                  <tr key={row.id} className="border-b align-top last:border-0">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(row.lastActivityAt).toLocaleString("tr-TR")}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          row.stage === "checkout"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {row.stage === "checkout" ? "Ödeme" : "Sepet"}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/admin/analytics/visitors/${encodeURIComponent(row.visitorKey)}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {displayName}
                      </Link>
                      <div className="mt-1 space-y-0.5 text-xs text-zinc-600">
                        {row.customerEmail ? <div>{row.customerEmail}</div> : null}
                        {row.customerPhone ? <div>{row.customerPhone}</div> : null}
                        {row.hasCustomerAccount ? (
                          <div className="text-emerald-700">Üye hesabı</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3 max-w-xs text-zinc-700">
                      {formatCartItemsPreview(row.itemsJson, 3)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {formatTry(row.cartValueMinor)}
                      <span className="text-zinc-500"> · {row.itemCount} adet</span>
                    </td>
                    <td className="p-3 text-xs text-zinc-600">
                      {row.remindedAt ? (
                        <div>E-posta: {new Date(row.remindedAt).toLocaleDateString("tr-TR")}</div>
                      ) : null}
                      {row.whatsappRemindedAt ? (
                        <div>WA: {new Date(row.whatsappRemindedAt).toLocaleDateString("tr-TR")}</div>
                      ) : null}
                      {!row.remindedAt && !row.whatsappRemindedAt ? "—" : null}
                    </td>
                    <td className="p-3 min-w-[10rem]">
                      <textarea
                        className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                        rows={2}
                        value={noteValue}
                        onChange={(e) =>
                          setNoteDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveNotes(row.id)}
                        className="mt-1 text-xs text-blue-700 underline disabled:opacity-50"
                      >
                        Kaydet
                      </button>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {row.customerEmail ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => sendEmail(row.id, !!row.remindedAt)}
                            className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
                          >
                            {busy ? "…" : row.remindedAt ? "E-posta tekrar" : "E-posta"}
                          </button>
                        ) : null}
                        {row.customerPhone ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openWhatsapp(row.id)}
                            className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {busy ? "…" : "WhatsApp"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => dismiss(row.id)}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                        >
                          Kapat
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
