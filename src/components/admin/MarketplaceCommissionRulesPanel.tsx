"use client";

import { useEffect, useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import { formatTry, minorToTry } from "@/lib/admin/money";
import { SHIPPING_MODELS, type CommissionRuleRow } from "@/lib/marketplace/commission-types";

type CategoryOption = { id: string; label: string };

export function MarketplaceCommissionRulesPanel({
  platform,
  platformLabel,
  categories,
  initialRules,
  tablesReady = true,
}: {
  platform: string;
  platformLabel: string;
  categories: CategoryOption[];
  initialRules: CommissionRuleRow[];
  tablesReady?: boolean;
}) {
  const [rules, setRules] = useState(initialRules);
  const [categoryId, setCategoryId] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("18");
  const [extraCommissionPercent, setExtraCommissionPercent] = useState("0");
  const [shippingModel, setShippingModel] = useState("marketplace_cargo");
  const [shippingFee, setShippingFee] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function loadRuleIntoForm(rule: CommissionRuleRow) {
    setCategoryId(rule.categoryId ?? "");
    setCommissionPercent(String(rule.commissionPercent));
    setExtraCommissionPercent(String(rule.extraCommissionPercent ?? 0));
    setShippingModel(rule.shippingModel);
    setShippingFee(rule.shippingFeeMinor > 0 ? minorToTry(rule.shippingFeeMinor) : "");
    setNotes(rule.notes ?? "");
  }

  useEffect(() => {
    const platformDefault = initialRules.find((r) => !r.categoryId);
    if (platformDefault) loadRuleIntoForm(platformDefault);
  }, [initialRules]);

  async function saveRule() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/integrations/marketplaces/commission-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        categoryId: categoryId || null,
        commissionPercent: parseFloat(commissionPercent.replace(",", ".")) || 15,
        extraCommissionPercent: parseFloat(extraCommissionPercent.replace(",", ".")) || 0,
        shippingModel,
        shippingFee,
        notes: notes.trim() || undefined,
      }),
    });
    const j = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "Kayıt başarısız");
      return;
    }
    const list = await fetch(`/api/admin/integrations/marketplaces/commission-rules?platform=${platform}`);
    const data = (await list.json()) as { rules?: CommissionRuleRow[] };
    setRules(data.rules ?? []);
    setMsg("Komisyon kuralı kaydedildi");
    setCategoryId("");
    setNotes("");
  }

  async function removeRule(id: string) {
    if (!confirm("Bu kural silinsin mi?")) return;
    setBusy(true);
    const res = await fetch(
      `/api/admin/integrations/marketplaces/commission-rules?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (res.ok) {
      setRules((r) => r.filter((x) => x.id !== id));
      setMsg("Silindi");
    }
  }

  if (!tablesReady) {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Komisyon tablosu için Prisma güncellemesi gerekli. Dev sunucuyu durdurup{" "}
        <code>npx prisma generate</code> çalıştırın.
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-violet-200 bg-violet-50/50 p-5">
      <h3 className="font-semibold text-violet-950">{platformLabel} — komisyon & kargo kuralları</h3>
      <p className="mt-1 text-xs text-violet-900">
        Kategori bazlı komisyon, ek komisyon ve kargo kesintisi tanımlayın. Değişikliklerin ürün
        fiyat özetine yansıması için <strong>Kural kaydet</strong> düğmesine basın.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AdminField label="Yerel kategori">
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Varsayılan (tüm kategoriler)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Komisyon (%)">
          <input
            className={inputClass}
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
          />
        </AdminField>
        <AdminField
          label="Ek komisyon (%)"
          hint="Hizmet bedeli vb. — brüt satış üzerinden, ana komisyona eklenir"
        >
          <input
            className={inputClass}
            type="number"
            step="0.1"
            min={0}
            max={100}
            value={extraCommissionPercent}
            onChange={(e) => setExtraCommissionPercent(e.target.value)}
          />
        </AdminField>
        <AdminField label="Kargo modeli">
          <select
            className={inputClass}
            value={shippingModel}
            onChange={(e) => setShippingModel(e.target.value)}
          >
            {SHIPPING_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Tahmini kargo kesintisi (TL)" hint="Pazaryeri kargo modelinde sipariş başına">
          <input
            className={inputClass}
            type="number"
            step="0.01"
            min={0}
            value={shippingFee}
            onChange={(e) => setShippingFee(e.target.value)}
            disabled={shippingModel !== "marketplace_cargo"}
          />
        </AdminField>
      </div>
      <AdminField label="Not">
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </AdminField>
      <button type="button" className={`${btnPrimary} mt-2`} disabled={busy} onClick={() => void saveRule()}>
        Kural kaydet
      </button>

      {rules.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-violet-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-violet-50 text-left text-xs uppercase text-violet-800">
              <tr>
                <th className="px-3 py-2">Kategori</th>
                <th className="px-3 py-2">Komisyon</th>
                <th className="px-3 py-2">Ek kom.</th>
                <th className="px-3 py-2">Kargo</th>
                <th className="px-3 py-2">Kargo kesintisi</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-violet-100">
                  <td className="px-3 py-2">{r.categoryTitle ?? "—"}</td>
                  <td className="px-3 py-2">%{r.commissionPercent}</td>
                  <td className="px-3 py-2">
                    {r.extraCommissionPercent > 0 ? `%${r.extraCommissionPercent}` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {SHIPPING_MODELS.find((m) => m.id === r.shippingModel)?.label ?? r.shippingModel}
                  </td>
                  <td className="px-3 py-2">
                    {r.shippingFeeMinor > 0 ? formatTry(r.shippingFeeMinor) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      disabled={busy}
                      onClick={() => void removeRule(r.id)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-violet-800">
          Henüz kayıtlı kural yok — formu doldurup <strong>Kural kaydet</strong> ile %18 (veya istediğiniz
          oran) kaydedin. Kayıt yoksa ürün sayfasında varsayılan %15 komisyon kullanılır.
        </p>
      )}

      {msg ? <p className="mt-3 text-sm text-violet-950">{msg}</p> : null}
    </div>
  );
}
