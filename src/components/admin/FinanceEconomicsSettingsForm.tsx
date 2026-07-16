"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";
import type { SiteSettings } from "@/lib/site-settings";

function minorToTryInput(minor: number | undefined): string {
  if (minor == null || minor <= 0) return "";
  return String(minor / 100);
}

function tryInputToMinor(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function FinanceEconomicsSettingsForm({ initial }: { initial: SiteSettings }) {
  const [cardFeePercent, setCardFeePercent] = useState(
    initial.finance?.cardFeePercent != null ? String(initial.finance.cardFeePercent) : "",
  );
  const [webShippingTry, setWebShippingTry] = useState(
    minorToTryInput(initial.finance?.webShippingCostMinor),
  );
  const [packagingTry, setPackagingTry] = useState(
    minorToTryInput(initial.finance?.packagingCostMinor),
  );
  const [trendyolFixedFeeTry, setTrendyolFixedFeeTry] = useState(
    minorToTryInput(initial.finance?.trendyolFixedFeeMinor),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    const feeRaw = parseFloat(cardFeePercent.replace(",", "."));
    const payload: SiteSettings = {
      ...initial,
      finance: {
        ...initial.finance,
        cardFeePercent:
          Number.isFinite(feeRaw) && feeRaw >= 0 && feeRaw <= 15 ? feeRaw : undefined,
        webShippingCostMinor: tryInputToMinor(webShippingTry),
        packagingCostMinor: tryInputToMinor(packagingTry),
        trendyolFixedFeeMinor: tryInputToMinor(trendyolFixedFeeTry),
      },
    };
    const res = await fetch("/api/admin/integrations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    setMsg(res.ok ? "Kaydedildi — mevcut siparişler için «Siparişleri aktar» ile snapshot yenileyin." : "Kayıt başarısız");
  }

  const webShippingMinor = tryInputToMinor(webShippingTry);

  return (
    <section className="admin-card admin-card-pad mt-8 space-y-4">
      <div>
        <h2 className="font-semibold">Kâr tahmini ayarları</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Web siparişlerinde müşteri ücretsiz kargo alsın bile sizin kargo gideriniz buradan düşülür.
          Ürün formundaki tahmini net kâr ve sipariş ekonomisi bu değerleri kullanır.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminField
          label="Web kargo maliyeti (TL / sipariş)"
          hint="Kargo firmasına ödediğiniz ortalama tutar — ücretsiz kargo kampanyasında da geçerli"
        >
          <input
            className={inputClass}
            type="number"
            min={0}
            step={0.01}
            placeholder="Örn. 89"
            value={webShippingTry}
            onChange={(e) => setWebShippingTry(e.target.value)}
          />
        </AdminField>
        <AdminField label="Paketleme gideri (TL / sipariş)" hint="Koli, bant, etiket vb. opsiyonel">
          <input
            className={inputClass}
            type="number"
            min={0}
            step={0.01}
            placeholder="Örn. 5"
            value={packagingTry}
            onChange={(e) => setPackagingTry(e.target.value)}
          />
        </AdminField>
        <AdminField label="Kart komisyonu (%)" hint="iyzico gerçek kesinti (ör. 796→761,60 ≈ %4,32) — varsayılan %4,32">
          <input
            className={inputClass}
            type="number"
            min={0}
            max={15}
            step={0.01}
            placeholder="4.32"
            value={cardFeePercent}
            onChange={(e) => setCardFeePercent(e.target.value)}
          />
        </AdminField>
        <AdminField
          label="Trendyol sabit gider (TL / sipariş)"
          hint="Platform hizmet bedeli vb. sipariş başı sabit kesinti; komisyon ve kargodan ayrı"
        >
          <input
            className={inputClass}
            type="number"
            min={0}
            step={0.01}
            placeholder="Örn. 13.19"
            value={trendyolFixedFeeTry}
            onChange={(e) => setTrendyolFixedFeeTry(e.target.value)}
          />
        </AdminField>
      </div>
      {webShippingMinor <= 0 ? (
        <p className="text-sm text-amber-800">
          Web kargo maliyeti girilmedi — web siparişlerinde kâr fazla görünebilir.
        </p>
      ) : (
        <p className="text-sm text-green-700">
          Aktif: web siparişi başına tahmini {webShippingMinor / 100} TL kargo gideri.
        </p>
      )}
      <p className="text-xs text-zinc-500">
        Ücretsiz kargo eşiği (müşteriye gösterilen){" "}
        <Link href="/admin/settings/store" className="underline">
          mağaza ayarları
        </Link>{" "}
        ekranındadır; kâr hesabındaki kargo maliyeti buradan ayrı yönetilir.
      </p>
      <p className="text-xs text-zinc-500">
        Trendyol’da müşteriye ücretsiz kargo görünse bile sizden kesilen tutar{" "}
        <strong>komisyon kurallarındaki kargo kesintisi</strong> alanına; sipariş başı sabit bedeller
        ise bu ek alana girilmelidir.
      </p>
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      <button type="button" className={btnPrimary} disabled={busy} onClick={() => void save()}>
        Kaydet
      </button>
    </section>
  );
}
