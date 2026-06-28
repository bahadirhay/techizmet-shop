"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCariButton({ customerId, title }: { customerId: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function createCari() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/finance/counterparties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "site_member", customerId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Hata");
      } else {
        router.refresh();
      }
    } catch {
      setErr("İstek başarısız");
    } finally {
      setBusy(false);
    }
  }

  if (err) {
    return <span className="text-xs text-red-600">{err}</span>;
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void createCari()}
      className="rounded border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
    >
      {busy ? "Oluşturuluyor…" : "Cari Aç"}
    </button>
  );
}
