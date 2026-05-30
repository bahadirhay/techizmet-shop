"use client";

import { useState } from "react";
import { btnPrimary, inputClass } from "@/components/admin/AdminForm";

export function CustomerDetailForm({
  customerId,
  initialNotes,
}: {
  customerId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setBusy(false);
    setMsg(res.ok ? "Notlar kaydedildi" : "Kayıt başarısız");
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">CRM notları</label>
      <textarea
        className={`${inputClass} min-h-[120px]`}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="İç notlar — müşteri görmez"
      />
      <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
        {busy ? "Kaydediliyor…" : "Notları kaydet"}
      </button>
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
    </div>
  );
}
