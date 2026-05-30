"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  consentKey: string;
  decision: string;
  preferences: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export function CookieConsentLogs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/cookie-consents")
      .then((r) => r.json())
      .then((d: { rows?: Row[]; error?: string }) => {
        if (d.error) setErr(d.error);
        else setRows(d.rows ?? []);
      })
      .catch(() => setErr("Yüklenemedi"));
  }, []);

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!rows.length) return <p className="text-sm text-zinc-600">Henüz kayıt yok.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-zinc-50 text-left">
            <th className="p-3">Tarih</th>
            <th className="p-3">Karar</th>
            <th className="p-3">Cihaz anahtarı</th>
            <th className="p-3">IP</th>
            <th className="p-3">Tercihler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="p-3 whitespace-nowrap">{new Date(r.createdAt).toLocaleString("tr-TR")}</td>
              <td className="p-3">{r.decision}</td>
              <td className="p-3 font-mono text-xs">{r.consentKey.slice(0, 12)}…</td>
              <td className="p-3">{r.ipAddress ?? "—"}</td>
              <td className="p-3 max-w-xs truncate font-mono text-xs">{r.preferences ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
