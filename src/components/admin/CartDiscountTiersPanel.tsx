"use client";

import { useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import type { CartDiscountTiersState } from "@/lib/admin/cart-discount-tiers";

function tryStr(v: number | null): string {
  if (v == null) return "";
  return String(v);
}

export function CartDiscountTiersPanel({ initial }: { initial: CartDiscountTiersState }) {
  const [tier1MinTry, setTier1MinTry] = useState(tryStr(initial.tier1.minTry));
  const [tier1Percent, setTier1Percent] = useState(String(initial.tier1.percent));
  const [tier1Active, setTier1Active] = useState(initial.tier1.active);
  const [tier2MinTry, setTier2MinTry] = useState(tryStr(initial.tier2.minTry));
  const [tier2Percent, setTier2Percent] = useState(String(initial.tier2.percent));
  const [tier2Active, setTier2Active] = useState(initial.tier2.active);
  const [secondItemPercent, setSecondItemPercent] = useState(String(initial.secondItem.percent));
  const [secondItemActive, setSecondItemActive] = useState(initial.secondItem.active);
  const [firstOrderPercent, setFirstOrderPercent] = useState(String(initial.firstOrder.percent));
  const [firstOrderActive, setFirstOrderActive] = useState(initial.firstOrder.active);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/admin/campaigns/tiers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier1MinTry,
          tier1Percent,
          tier1Active,
          tier2MinTry,
          tier2Percent,
          tier2Active,
          secondItemPercent,
          secondItemActive,
          firstOrderPercent,
          firstOrderActive,
        }),
      });
      const data = (await res.json()) as { error?: string; tiers?: CartDiscountTiersState };
      if (!res.ok) {
        setErr(data.error ?? "Kayıt başarısız");
        return;
      }
      if (data.tiers) {
        setTier1MinTry(tryStr(data.tiers.tier1.minTry));
        setTier1Percent(String(data.tiers.tier1.percent));
        setTier1Active(data.tiers.tier1.active);
        setTier2MinTry(tryStr(data.tiers.tier2.minTry));
        setTier2Percent(String(data.tiers.tier2.percent));
        setTier2Active(data.tiers.tier2.active);
        setSecondItemPercent(String(data.tiers.secondItem.percent));
        setSecondItemActive(data.tiers.secondItem.active);
        setFirstOrderPercent(String(data.tiers.firstOrder.percent));
        setFirstOrderActive(data.tiers.firstOrder.active);
      }
      setMsg("Sepet indirim kademeleri kaydedildi.");
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-card admin-card-pad mt-6">
      <h2 className="font-semibold">Sepet indirim kademeleri</h2>
      <p className="mt-1 text-sm text-zinc-500">
        999 TL ve 1.499 TL eşiklerini buradan değiştirebilirsiniz. Kayıt sonrası kampanya listesi
        otomatik güncellenir.
      </p>

      <form onSubmit={onSave} className="mt-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 text-sm font-medium">1. kademe</legend>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tier1Active}
                onChange={(e) => setTier1Active(e.target.checked)}
              />
              Aktif
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Sepet eşiği (TL)">
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  value={tier1MinTry}
                  onChange={(e) => setTier1MinTry(e.target.value)}
                  placeholder="999"
                />
              </AdminField>
              <AdminField label="İndirim (%)">
                <input
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={tier1Percent}
                  onChange={(e) => setTier1Percent(e.target.value)}
                  placeholder="15"
                />
              </AdminField>
            </div>
          </fieldset>

          <fieldset className="rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 text-sm font-medium">2. kademe</legend>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tier2Active}
                onChange={(e) => setTier2Active(e.target.checked)}
              />
              Aktif
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Sepet eşiği (TL)">
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  value={tier2MinTry}
                  onChange={(e) => setTier2MinTry(e.target.value)}
                  placeholder="1499"
                />
              </AdminField>
              <AdminField label="İndirim (%)">
                <input
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={tier2Percent}
                  onChange={(e) => setTier2Percent(e.target.value)}
                  placeholder="20"
                />
              </AdminField>
            </div>
          </fieldset>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 text-sm font-medium">2. ürün indirimi</legend>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={secondItemActive}
                onChange={(e) => setSecondItemActive(e.target.checked)}
              />
              Aktif
            </label>
            <AdminField label="İndirim (%)">
              <input
                type="text"
                inputMode="numeric"
                className={inputClass}
                value={secondItemPercent}
                onChange={(e) => setSecondItemPercent(e.target.value)}
                placeholder="50"
              />
            </AdminField>
          </fieldset>

          <fieldset className="rounded-lg border border-zinc-200 p-4">
            <legend className="px-1 text-sm font-medium">İlk sipariş indirimi</legend>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={firstOrderActive}
                onChange={(e) => setFirstOrderActive(e.target.checked)}
              />
              Aktif
            </label>
            <AdminField label="İndirim (%)">
              <input
                type="text"
                inputMode="numeric"
                className={inputClass}
                value={firstOrderPercent}
                onChange={(e) => setFirstOrderPercent(e.target.value)}
                placeholder="10"
              />
            </AdminField>
          </fieldset>
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}

        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? "Kaydediliyor…" : "Kademeleri kaydet"}
        </button>
      </form>
    </section>
  );
}
