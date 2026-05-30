"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, inputClass } from "@/components/admin/AdminForm";

export function CustomerGroupAssign({
  customerId,
  groups,
  currentGroupId,
}: {
  customerId: string;
  groups: { id: string; name: string; discountPercent: number }[];
  currentGroupId: string | null;
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(currentGroupId ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerGroupId: groupId || null }),
    });
    setBusy(false);
    if (!res.ok) {
      setMsg("Atama başarısız");
      return;
    }
    setMsg("Grup güncellendi");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Üye grubu</label>
      <select
        className={inputClass}
        value={groupId}
        onChange={(e) => setGroupId(e.target.value)}
      >
        <option value="">Grup yok (standart fiyat)</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name} (%{g.discountPercent} indirim)
          </option>
        ))}
      </select>
      <button type="button" className={btnPrimary} onClick={save} disabled={busy}>
        {busy ? "Kaydediliyor…" : "Grubu kaydet"}
      </button>
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
    </div>
  );
}
