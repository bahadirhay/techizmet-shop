"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";

export function CounterpartyCreditForm({
  counterpartyId,
  initial,
}: {
  counterpartyId: string;
  initial: {
    paymentTermDays: number | null;
    creditLimitMinor: number | null;
    openAccountEnabled: boolean;
    creditHold: boolean;
    preferredPaymentMethod: string | null;
    tags: string | null;
  };
}) {
  const router = useRouter();
  const [paymentTermDays, setPaymentTermDays] = useState(
    initial.paymentTermDays != null ? String(initial.paymentTermDays) : "",
  );
  const [creditLimitTry, setCreditLimitTry] = useState(
    initial.creditLimitMinor != null ? String(initial.creditLimitMinor / 100) : "",
  );
  const [openAccountEnabled, setOpenAccountEnabled] = useState(initial.openAccountEnabled);
  const [creditHold, setCreditHold] = useState(initial.creditHold);
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState(
    initial.preferredPaymentMethod ?? "",
  );
  const [tags, setTags] = useState(initial.tags ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/finance/counterparties/${counterpartyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentTermDays: paymentTermDays.trim() ? Number(paymentTermDays) : null,
        creditLimitMinor: creditLimitTry.trim()
          ? Math.round(parseFloat(creditLimitTry.replace(",", ".")) * 100)
          : null,
        openAccountEnabled,
        creditHold,
        preferredPaymentMethod: preferredPaymentMethod.trim() || null,
        tags: tags.trim() || null,
      }),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Kaydedilemedi");
      return;
    }
    setMsg("Cari koşulları güncellendi.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="admin-card admin-card-pad space-y-3">
      <h2 className="font-semibold">Açık hesap & cari risk</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <AdminField label="Vade (gün)">
          <input
            className={inputClass}
            type="number"
            min={0}
            value={paymentTermDays}
            onChange={(e) => setPaymentTermDays(e.target.value)}
          />
        </AdminField>
        <AdminField label="Risk limiti (TL)">
          <input
            className={inputClass}
            inputMode="decimal"
            value={creditLimitTry}
            onChange={(e) => setCreditLimitTry(e.target.value)}
          />
        </AdminField>
        <AdminField label="Tercih edilen ödeme">
          <select
            className={inputClass}
            value={preferredPaymentMethod}
            onChange={(e) => setPreferredPaymentMethod(e.target.value)}
          >
            <option value="">—</option>
            <option value="open_account">Açık hesap (vadeli)</option>
            <option value="bank_transfer">Havale / EFT</option>
            <option value="mixed">Karma</option>
          </select>
        </AdminField>
        <AdminField label="Etiketler (virgülle)">
          <input
            className={inputClass}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="B2B, Bayi"
          />
        </AdminField>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={openAccountEnabled}
          onChange={(e) => setOpenAccountEnabled(e.target.checked)}
        />
        Açık hesap siparişine izin ver
      </label>
      <label className="flex items-center gap-2 text-sm text-red-800">
        <input
          type="checkbox"
          checked={creditHold}
          onChange={(e) => setCreditHold(e.target.checked)}
        />
        Cari risk kilidi (yeni sipariş engeli)
      </label>
      <button type="submit" className={btnPrimary} disabled={busy}>
        {busy ? "Kaydediliyor…" : "Koşulları kaydet"}
      </button>
      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}
      <p className="text-xs text-zinc-500">
        <Link href="/admin/finance/cari" className="underline">
          Cari listesi
        </Link>
      </p>
    </form>
  );
}
