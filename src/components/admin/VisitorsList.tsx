"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTry } from "@/lib/format";

type VisitorRow = {
  visitorKey: string;
  firstSeenAt: string;
  lastSeenAt: string;
  deviceType: string | null;
  utmSource: string | null;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  eventCount: number;
  openCartValueMinor: number | null;
  openCartItems: number | null;
  openCartAt: string | null;
};

export function VisitorsList() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<VisitorRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/admin/analytics/visitors?${params}`)
      .then((r) => r.json())
      .then((d: { visitors?: VisitorRow[]; error?: string }) => {
        if (d.error) setErr(d.error);
        else {
          setErr(null);
          setRows(d.visitors ?? []);
        }
      })
      .catch(() => setErr("Yüklenemedi"))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="E-posta, ad veya ziyaretçi anahtarı…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <Link href="/admin/analytics" className="text-sm text-zinc-600 underline">
          Özet panele dön
        </Link>
      </div>

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {loading ? <p className="text-sm text-zinc-600">Yükleniyor…</p> : null}

      {!loading && !rows.length ? (
        <p className="text-sm text-zinc-500">Son 30 günde ziyaretçi kaydı yok.</p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left">
                <th className="p-3">Ziyaretçi</th>
                <th className="p-3">Son görülme</th>
                <th className="p-3">Olay</th>
                <th className="p-3">Açık sepet</th>
                <th className="p-3">Kaynak</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.visitorKey} className="border-b last:border-0 hover:bg-zinc-50/80">
                  <td className="p-3">
                    <Link
                      href={`/admin/analytics/visitors/${encodeURIComponent(v.visitorKey)}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {v.customerName ?? v.customerEmail ?? `Ziyaretçi …${v.visitorKey.slice(-8)}`}
                    </Link>
                    {v.customerEmail && v.customerName ? (
                      <p className="text-xs text-zinc-500">{v.customerEmail}</p>
                    ) : null}
                    <p className="font-mono text-[10px] text-zinc-400">{v.visitorKey}</p>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {new Date(v.lastSeenAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="p-3">{v.eventCount}</td>
                  <td className="p-3">
                    {v.openCartValueMinor != null ? (
                      <span className="text-amber-800">
                        {formatTry(v.openCartValueMinor)}
                        {v.openCartItems != null ? ` · ${v.openCartItems} adet` : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-zinc-600">{v.utmSource ?? v.deviceType ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="text-xs text-zinc-500">
        Son 30 gün, en fazla 50 kayıt. Aynı kişi farklı cihazda farklı satır olabilir; üye girişi
        kayıtları birleştirir.
      </p>
    </div>
  );
}
