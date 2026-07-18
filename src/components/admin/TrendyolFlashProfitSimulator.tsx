"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminField, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { formatTry, tryToMinor } from "@/lib/admin/money";
import {
  shippingModelLabel,
  type ResolvedCommissionRule,
} from "@/lib/marketplace/commission-types";
import { computeFlashCampaignEconomics } from "@/lib/marketplace/pricing-calculator";

type LivePayload = {
  barcode: string | null;
  liveSalePriceMinor: number | null;
  liveListPriceMinor: number | null;
  listingStatus: string | null;
  effectiveCommissionPercent: number | null;
  commissionSampleOrders: number;
  commissionSource: "product_settlement" | "platform_settlement" | "rule" | "none";
  rule: ResolvedCommissionRule;
  fixedFeeMinor: number;
  packagingCostMinor: number;
  warnings: string[];
};

function statusLabel(status: "profit" | "breakeven" | "loss" | "unknown"): string {
  switch (status) {
    case "profit":
      return "KÂR";
    case "breakeven":
      return "BAŞA BAŞ";
    case "loss":
      return "ZARAR";
    default:
      return "MALİYET EKSİK";
  }
}

function statusClass(status: "profit" | "breakeven" | "loss" | "unknown"): string {
  switch (status) {
    case "profit":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "breakeven":
      return "bg-amber-100 text-amber-950 border-amber-300";
    case "loss":
      return "bg-red-100 text-red-900 border-red-300";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-300";
  }
}

function commissionSourceLabel(source: LivePayload["commissionSource"], samples: number): string {
  switch (source) {
    case "product_settlement":
      return `Ürün settlement (${samples} sipariş)`;
    case "platform_settlement":
      return `Trendyol genel settlement (${samples} sipariş)`;
    case "rule":
      return "Panel komisyon kuralı";
    default:
      return "Komisyon yok";
  }
}

export function TrendyolFlashProfitSimulator({
  listPriceTry,
  costTry,
  rule: fallbackRule,
  fixedFeeMinor: fallbackFixedFee,
  packagingCostMinor: fallbackPackaging,
  productId,
  barcode,
  categoryId,
}: {
  listPriceTry: string;
  costTry: string;
  rule: ResolvedCommissionRule | null;
  fixedFeeMinor: number;
  packagingCostMinor: number;
  productId?: string;
  barcode?: string;
  categoryId?: string;
}) {
  const localListMinor = tryToMinor(listPriceTry);
  const costMinor = tryToMinor(costTry) || null;

  const [live, setLive] = useState<LivePayload | null>(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const [flashPrice, setFlashPrice] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [manualCommissionOverride, setManualCommissionOverride] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchLive = useCallback(async () => {
    if (!productId && !barcode?.trim()) {
      setLiveError("Barkod veya kayıtlı ürün gerekli.");
      return;
    }
    setLiveBusy(true);
    setLiveError(null);
    try {
      const q = new URLSearchParams();
      if (productId) q.set("productId", productId);
      if (barcode?.trim()) q.set("barcode", barcode.trim());
      if (categoryId?.trim()) q.set("categoryId", categoryId.trim());
      const res = await fetch(`/api/admin/marketplace/trendyol/flash-live?${q}`);
      const j = (await res.json()) as LivePayload & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Trendyol verisi alınamadı");
      setLive(j);
      const liveList = j.liveSalePriceMinor ?? j.liveListPriceMinor;
      if (liveList != null && liveList > 0) {
        setFlashPrice((prev) => (prev.trim() ? prev : (liveList / 100).toFixed(2)));
      }
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : "Trendyol verisi alınamadı");
    } finally {
      setLiveBusy(false);
    }
  }, [productId, barcode, categoryId]);

  useEffect(() => {
    void fetchLive();
  }, [fetchLive]);

  const listMinor =
    live?.liveSalePriceMinor ??
    live?.liveListPriceMinor ??
    (localListMinor > 0 ? localListMinor : 0);

  useEffect(() => {
    if (listMinor > 0) {
      setFlashPrice((prev) => (prev.trim() ? prev : (listMinor / 100).toFixed(2)));
    }
  }, [listMinor]);

  const flashMinor = tryToMinor(flashPrice);

  const activeRule: ResolvedCommissionRule | null = useMemo(() => {
    const base = live?.rule ?? fallbackRule;
    if (!base) return null;
    const overrideRaw = manualCommissionOverride.trim();
    if (overrideRaw) {
      const n = parseFloat(overrideRaw.replace(",", "."));
      if (Number.isFinite(n) && n >= 0 && n <= 100) {
        return { ...base, commissionPercent: n, extraCommissionPercent: 0 };
      }
    }
    if (live?.effectiveCommissionPercent != null) {
      return {
        ...base,
        commissionPercent: live.effectiveCommissionPercent,
        extraCommissionPercent: 0,
      };
    }
    return base;
  }, [live, fallbackRule, manualCommissionOverride]);

  const fixedFeeMinor = live?.fixedFeeMinor ?? fallbackFixedFee;
  const packagingCostMinor = live?.packagingCostMinor ?? fallbackPackaging;

  function applyDiscountPercent(raw: string) {
    setDiscountPct(raw);
    const pct = parseFloat(raw.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100 || listMinor <= 0) return;
    const next = Math.round(listMinor * (1 - pct / 100));
    setFlashPrice((next / 100).toFixed(2));
  }

  const econ = useMemo(() => {
    if (!activeRule || flashMinor <= 0) return null;
    return computeFlashCampaignEconomics({
      listPriceMinor: listMinor > 0 ? listMinor : flashMinor,
      flashPriceMinor: flashMinor,
      costMinor,
      rule: activeRule,
      campaignExtraCommissionPercent: 0,
      fixedFeeMinor,
      packagingCostMinor,
    });
  }, [activeRule, flashMinor, listMinor, costMinor, fixedFeeMinor, packagingCostMinor]);

  if (!fallbackRule && !live?.rule) {
    return (
      <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-4 text-sm text-orange-950">
        Trendyol komisyon kuralı yüklenemedi.{" "}
        <Link href="/admin/integrations" className="underline">
          Komisyon kuralları
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-orange-300 bg-orange-50/40 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-orange-950">Trendyol flash / kampanya kâr-zarar</p>
          <p className="mt-1 text-xs text-orange-900/80">
            Canlı TY fiyatı ve gerçek komisyon Trendyol’dan çekilir. Siz yalnızca flash fiyatını (ve
            ürün maliyetini) girersiniz — yayınlamadan önce kâr/zararı görün.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnSecondary}
            disabled={liveBusy}
            onClick={() => void fetchLive()}
          >
            {liveBusy ? "Çekiliyor…" : "Trendyol’dan güncelle"}
          </button>
          {econ ? (
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-bold tracking-wide ${statusClass(econ.status)}`}
            >
              {statusLabel(econ.status)}
              {econ.profitMinor != null ? ` · ${formatTry(econ.profitMinor)}` : ""}
            </span>
          ) : null}
        </div>
      </div>

      {liveError ? <p className="text-xs text-red-700">{liveError}</p> : null}
      {live?.warnings?.length ? (
        <ul className="space-y-0.5 text-xs text-amber-900">
          {live.warnings.map((w) => (
            <li key={w}>• {w}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-zinc-700 ring-1 ring-orange-200">
          Fiyat:{" "}
          {live?.liveSalePriceMinor != null
            ? "Trendyol canlı"
            : localListMinor > 0
              ? "admin TY fiyatı"
              : "yok"}
        </span>
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-zinc-700 ring-1 ring-orange-200">
          Komisyon:{" "}
          {live
            ? commissionSourceLabel(live.commissionSource, live.commissionSampleOrders)
            : "yükleniyor…"}
        </span>
        {live?.barcode ? (
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-zinc-700 ring-1 ring-orange-200">
            Barkod: {live.barcode}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminField label="Mevcut TY satış fiyatı" hint="Trendyol API’den canlı">
          <input
            className={inputClass}
            value={listMinor > 0 ? (listMinor / 100).toFixed(2) : "—"}
            readOnly
            disabled
          />
        </AdminField>
        <AdminField label="Flash satış fiyatı (TL)" hint="Yayınlayacağınız indirimli fiyat — tek manuel girdi">
          <input
            className={inputClass}
            inputMode="decimal"
            value={flashPrice}
            onChange={(e) => {
              setFlashPrice(e.target.value);
              setDiscountPct("");
            }}
            placeholder="Örn. 299.90"
          />
        </AdminField>
        <AdminField label="İndirim %" hint="Canlı TY fiyatına göre hızlı hesap">
          <input
            className={inputClass}
            inputMode="decimal"
            value={discountPct}
            onChange={(e) => applyDiscountPercent(e.target.value)}
            placeholder="Örn. 20"
            disabled={listMinor <= 0}
          />
        </AdminField>
      </div>

      <button
        type="button"
        className="text-xs text-orange-900 underline"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? "Gelişmiş ayarları gizle" : "Gelişmiş: komisyon override"}
      </button>
      {showAdvanced ? (
        <AdminField
          label="Komisyon % override"
          hint="Boş bırakın — Trendyol settlement / kural otomatik kullanılır"
        >
          <input
            className={inputClass}
            inputMode="decimal"
            value={manualCommissionOverride}
            onChange={(e) => setManualCommissionOverride(e.target.value)}
            placeholder={
              live?.effectiveCommissionPercent != null
                ? String(live.effectiveCommissionPercent)
                : "otomatik"
            }
          />
        </AdminField>
      ) : null}

      {econ ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <tbody className="divide-y divide-orange-100">
                <tr>
                  <td className="py-1.5 pr-3 text-zinc-600">Brüt satış (flash)</td>
                  <td className="py-1.5 text-right tabular-nums font-medium">
                    {formatTry(econ.flashPriceMinor)}
                  </td>
                </tr>
                {econ.discountPercent != null && econ.discountPercent !== 0 ? (
                  <tr>
                    <td className="py-1.5 pr-3 text-zinc-600">İndirim (TY fiyatına göre)</td>
                    <td className="py-1.5 text-right tabular-nums text-amber-900">
                      %{econ.discountPercent}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td className="py-1.5 pr-3 text-zinc-600">
                    Komisyon (%{econ.commissionPercent}
                    {econ.extraCommissionPercent > 0 ? ` + %${econ.extraCommissionPercent} ek` : ""})
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-amber-900">
                    −{formatTry(econ.commissionMinor)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-zinc-600">
                    Kargo kesintisi ({shippingModelLabel(econ.shippingModel)})
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-amber-900">
                    {econ.marketplaceShippingDeductionMinor > 0
                      ? `−${formatTry(econ.marketplaceShippingDeductionMinor)}`
                      : "—"}
                  </td>
                </tr>
                {econ.sellerShippingCostMinor > 0 ? (
                  <tr>
                    <td className="py-1.5 pr-3 text-zinc-600">Satıcı kargo maliyeti</td>
                    <td className="py-1.5 text-right tabular-nums text-amber-900">
                      −{formatTry(econ.sellerShippingCostMinor)}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td className="py-1.5 pr-3 text-zinc-600">
                    Sabit hizmet bedeli{" "}
                    <Link href="/admin/finance" className="text-[10px] underline">
                      ayar
                    </Link>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-amber-900">
                    {econ.fixedFeeMinor > 0 ? `−${formatTry(econ.fixedFeeMinor)}` : "—"}
                  </td>
                </tr>
                {econ.packagingCostMinor > 0 ? (
                  <tr>
                    <td className="py-1.5 pr-3 text-zinc-600">Paketleme</td>
                    <td className="py-1.5 text-right tabular-nums text-amber-900">
                      −{formatTry(econ.packagingCostMinor)}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td className="py-1.5 pr-3 text-zinc-600">Net hakediş</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold text-orange-950">
                    {formatTry(econ.netPayoutMinor)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-zinc-600">Ürün maliyeti</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {econ.costMinor != null ? `−${formatTry(econ.costMinor)}` : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-medium text-zinc-800">Net kâr / zarar</td>
                  <td
                    className={`py-1.5 text-right tabular-nums font-bold ${
                      econ.profitMinor == null
                        ? "text-zinc-500"
                        : econ.profitMinor >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                    }`}
                  >
                    {econ.profitMinor != null ? formatTry(econ.profitMinor) : "Maliyet girin"}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 text-zinc-600">Marj (maliyet üzerinden)</td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${
                      econ.marginOnCostPercent == null
                        ? "text-zinc-500"
                        : econ.marginOnCostPercent >= 20
                          ? "text-emerald-700"
                          : econ.marginOnCostPercent >= 0
                            ? "text-amber-800"
                            : "text-red-600"
                    }`}
                  >
                    {econ.marginOnCostPercent != null ? `%${econ.marginOnCostPercent}` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {econ.breakEvenPriceMinor != null ? (
            <p className="text-xs text-orange-950">
              Zararsız minimum flash fiyatı:{" "}
              <strong>{formatTry(econ.breakEvenPriceMinor)}</strong>
              {econ.flashPriceMinor < econ.breakEvenPriceMinor ? (
                <span className="text-red-700">
                  {" "}
                  — şu anki fiyat {formatTry(econ.breakEvenPriceMinor - econ.flashPriceMinor)} altında
                </span>
              ) : (
                <span className="text-emerald-800"> — flash fiyatı bu eşiğin üzerinde</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-amber-900">
              Ürün maliyetini girmeden zarar eşiği hesaplanamaz.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-amber-900">Flash satış fiyatı girin.</p>
      )}
    </div>
  );
}
