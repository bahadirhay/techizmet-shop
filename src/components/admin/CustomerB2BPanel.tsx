"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";

type Group = {
  id: string;
  name: string;
  discountPercent: number;
  isB2b: boolean;
  openAccountEnabled: boolean;
  defaultPaymentTermDays: number | null;
  defaultCreditLimitMinor: number | null;
};

export function CustomerB2BPanel({
  customerId,
  b2bStatus,
  companyName,
  b2bAppliedAt,
  b2bApplicationNote,
  taxId,
  taxOffice,
  groups,
  currentGroupId,
  counterpartyId,
}: {
  customerId: string;
  b2bStatus: string | null;
  companyName: string | null;
  b2bAppliedAt: Date | string | null;
  b2bApplicationNote: string | null;
  taxId: string | null;
  taxOffice: string | null;
  groups: Group[];
  currentGroupId: string | null;
  counterpartyId: string | null;
}) {
  const router = useRouter();
  const b2bGroups = groups.filter((g) => g.isB2b);
  const [groupId, setGroupId] = useState(currentGroupId ?? b2bGroups[0]?.id ?? "");
  const [paymentTermDays, setPaymentTermDays] = useState(
    String(b2bGroups.find((g) => g.id === groupId)?.defaultPaymentTermDays ?? 30),
  );
  const [creditLimitTry, setCreditLimitTry] = useState(
    b2bGroups.find((g) => g.id === groupId)?.defaultCreditLimitMinor
      ? String((b2bGroups.find((g) => g.id === groupId)!.defaultCreditLimitMinor! / 100))
      : "",
  );
  const [openAccount, setOpenAccount] = useState(
    b2bGroups.find((g) => g.id === groupId)?.openAccountEnabled ?? false,
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/customers/${customerId}/b2b`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        customerGroupId: action === "approve" ? groupId : undefined,
        paymentTermDays: action === "approve" ? Number(paymentTermDays) || null : undefined,
        creditLimitMinor:
          action === "approve" && creditLimitTry.trim()
            ? Math.round(parseFloat(creditLimitTry.replace(",", ".")) * 100)
            : undefined,
        openAccountEnabled: action === "approve" ? openAccount : undefined,
      }),
    });
    const j = (await res.json()) as { error?: string; counterpartyId?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "İşlem başarısız");
      return;
    }
    setMsg(action === "approve" ? "B2B üyeliği onaylandı — cari kartı oluşturuldu/güncellendi." : "Başvuru reddedildi.");
    router.refresh();
  }

  if (!b2bStatus && !companyName) return null;

  const statusLabel =
    b2bStatus === "pending"
      ? "Onay bekliyor"
      : b2bStatus === "approved"
        ? "Onaylı B2B"
        : b2bStatus === "rejected"
          ? "Reddedildi"
          : "—";

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-6">
      <h2 className="font-semibold text-indigo-950">B2B / Toptan üyelik</h2>
      <p className="mt-1 text-sm text-indigo-900">
        Durum: <strong>{statusLabel}</strong>
        {companyName ? ` · ${companyName}` : ""}
      </p>
      {b2bAppliedAt ? (
        <p className="mt-1 text-xs text-indigo-800">
          Başvuru: {new Date(b2bAppliedAt).toLocaleString("tr-TR")}
        </p>
      ) : null}
      {taxId ? (
        <p className="mt-1 text-xs text-indigo-800">
          VKN/TCKN: {taxId}
          {taxOffice ? ` · ${taxOffice}` : ""}
        </p>
      ) : null}
      {b2bApplicationNote ? (
        <p className="mt-2 text-sm text-indigo-900">
          <span className="font-medium">Not:</span> {b2bApplicationNote}
        </p>
      ) : null}
      {counterpartyId ? (
        <p className="mt-2 text-sm">
          <a
            href={`/admin/finance/counterparties/${counterpartyId}`}
            className="font-medium text-[var(--kn-brand)] underline"
          >
            Cari kartı →
          </a>
        </p>
      ) : null}

      {b2bStatus === "pending" ? (
        <div className="mt-4 space-y-3 border-t border-indigo-200 pt-4">
          <AdminField label="B2B grubu (indirim oranı grubda tanımlı)">
            <select
              className={inputClass}
              value={groupId}
              onChange={(e) => {
                const id = e.target.value;
                setGroupId(id);
                const g = b2bGroups.find((x) => x.id === id);
                if (g?.defaultPaymentTermDays) setPaymentTermDays(String(g.defaultPaymentTermDays));
                if (g?.defaultCreditLimitMinor) {
                  setCreditLimitTry(String(g.defaultCreditLimitMinor / 100));
                }
                setOpenAccount(g?.openAccountEnabled ?? false);
              }}
            >
              {b2bGroups.length === 0 ? (
                <option value="">Önce B2B müşteri grubu oluşturun</option>
              ) : (
                b2bGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (%{g.discountPercent})
                  </option>
                ))
              )}
            </select>
          </AdminField>
          <AdminField label="Vade (gün)">
            <input
              className={`${inputClass} max-w-[8rem]`}
              type="number"
              min={0}
              value={paymentTermDays}
              onChange={(e) => setPaymentTermDays(e.target.value)}
            />
          </AdminField>
          <AdminField label="Cari risk limiti (TL)">
            <input
              className={`${inputClass} max-w-[12rem]`}
              inputMode="decimal"
              placeholder="Örn. 50000"
              value={creditLimitTry}
              onChange={(e) => setCreditLimitTry(e.target.value)}
            />
          </AdminField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={openAccount}
              onChange={(e) => setOpenAccount(e.target.checked)}
            />
            Açık hesap (vadeli sipariş) izni
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !groupId}
              onClick={() => void act("approve")}
            >
              Onayla ve gruba ata
            </button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => void act("reject")}>
              Reddet
            </button>
          </div>
        </div>
      ) : null}

      {msg ? <p className="mt-3 text-sm text-indigo-950">{msg}</p> : null}
    </div>
  );
}
