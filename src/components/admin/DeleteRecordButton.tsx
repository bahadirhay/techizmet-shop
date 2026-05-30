"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnSecondary } from "@/components/admin/AdminForm";

export function DeleteRecordButton({
  apiUrl,
  redirectTo,
  label = "Sil",
}: {
  apiUrl: string;
  redirectTo: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz? Bağlı ürünlerde atama kaldırılır.")) return;
    setBusy(true);
    const res = await fetch(apiUrl, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      alert(json.error ?? "Silinemedi");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button type="button" className={`${btnSecondary} text-red-600`} onClick={remove} disabled={busy}>
      {busy ? "…" : label}
    </button>
  );
}
