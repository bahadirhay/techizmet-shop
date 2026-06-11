"use client";

import Link from "next/link";
import { formatTry } from "@/lib/admin/money";
import { estimateSingleWebOrderProfit } from "@/lib/finance/economics-math";

function parseTryInput(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function ProductProfitEstimate({
  price,
  cost,
  webShippingCostMinor,
  packagingCostMinor,
  cardFeePercent,
  freeShippingOverMinor = 0,
}: {
  price: string;
  cost: string;
  webShippingCostMinor: number;
  packagingCostMinor: number;
  cardFeePercent: number;
  freeShippingOverMinor?: number;
}) {
  const priceMinor = parseTryInput(price);
  const costMinor = parseTryInput(cost);
  if (priceMinor <= 0) return null;

  // Kargo eşiği: eşik varsa ve ürün fiyatı eşiği geçiyorsa satıcı karşılar
  const sellerPaysShipping =
    freeShippingOverMinor <= 0 || priceMinor >= freeShippingOverMinor;
  const effectiveShipping = sellerPaysShipping ? webShippingCostMinor : 0;

  const estimate = estimateSingleWebOrderProfit({
    priceMinor,
    costMinor,
    webShippingCostMinor: effectiveShipping,
    packagingCostMinor,
    cardFeePercent,
  });
  if (!estimate) return null;

  const hasCost = costMinor > 0;
  const hasShipping = webShippingCostMinor > 0;

  // Bilinen giderler (maliyet hariç): kargo (eşiğe göre) + paket + kart komisyonu
  const knownExpenses =
    (sellerPaysShipping ? estimate.shippingCostMinor : 0) +
    estimate.packagingCostMinor +
    estimate.paymentFeeMinor;
  // Toplam giderler (maliyet dahil veya hariç)
  const totalExpenses = estimate.costMinor + knownExpenses;
  // Satış fiyatından sadece bilinen giderler düşüldüğünde kalan (maliyet girilmemişse)
  const remainingAfterKnown = estimate.grossMinor - knownExpenses;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
      <p className="font-medium text-emerald-950">Tahmini kâr (web, tek ürün, kart)</p>
      <p className="mt-1 text-xs text-emerald-900/80">
        Kargo + paket + kart komisyonu dahil. Gerçek siparişte sepet tutarı, kupon ve ödeme
        yöntemine göre değişir.
      </p>
      <div className="mt-3 space-y-1 text-emerald-950">
        {/* Satış fiyatı */}
        <div className="flex justify-between gap-4 font-medium">
          <span>Satış fiyatı</span>
          <span>{formatTry(estimate.grossMinor)}</span>
        </div>

        {/* Ürün maliyeti */}
        {hasCost ? (
          <div className="flex justify-between gap-4">
            <span>Ürün maliyeti</span>
            <span>−{formatTry(estimate.costMinor)}</span>
          </div>
        ) : (
          <div className="flex justify-between gap-4 text-xs text-amber-700">
            <span>Ürün maliyeti</span>
            <span className="italic">girilmedi</span>
          </div>
        )}

        {/* Kargo */}
        {!hasShipping ? (
          <p className="text-xs text-amber-700">
            Web kargo maliyeti ayarlanmadı —{" "}
            <Link href="/admin/finance" className="underline">
              ön muhasebe ayarları
            </Link>
          </p>
        ) : sellerPaysShipping ? (
          <div className="flex justify-between gap-4 text-amber-900">
            <span>
              Kargo{freeShippingOverMinor > 0 ? " (ücretsiz kargo eşiği geçildi)" : " (sizin gideriniz)"}
            </span>
            <span>−{formatTry(estimate.shippingCostMinor)}</span>
          </div>
        ) : (
          <div className="flex justify-between gap-4 text-emerald-700">
            <span className="text-xs">
              Kargo müşteri öder{" "}
              <span className="text-zinc-500">(eşik: {formatTry(freeShippingOverMinor)} altı)</span>
            </span>
            <span className="text-xs font-medium">+{formatTry(webShippingCostMinor)} tasarruf</span>
          </div>
        )}

        {/* Paketleme */}
        {estimate.packagingCostMinor > 0 ? (
          <div className="flex justify-between gap-4 text-amber-900">
            <span>Paketleme</span>
            <span>−{formatTry(estimate.packagingCostMinor)}</span>
          </div>
        ) : null}

        {/* Kart komisyonu */}
        {estimate.paymentFeeMinor > 0 ? (
          <div className="flex justify-between gap-4 text-amber-900">
            <span>Kart komisyonu (%{cardFeePercent})</span>
            <span>−{formatTry(estimate.paymentFeeMinor)}</span>
          </div>
        ) : null}

        {/* Toplam giderler */}
        <div className="flex justify-between gap-4 border-t border-emerald-200 pt-2 text-amber-900">
          <span>Toplam giderler</span>
          <span>−{formatTry(hasCost ? totalExpenses : knownExpenses)}</span>
        </div>

        {/* Net kâr veya kalan tutar */}
        <div className="flex justify-between gap-4 border-t border-emerald-200 pt-2 font-semibold">
          {hasCost ? (
            <>
              <span>Tahmini net kâr</span>
              <span className={estimate.netProfitMinor >= 0 ? "text-emerald-700" : "text-red-600"}>
                {formatTry(estimate.netProfitMinor)}
              </span>
            </>
          ) : (
            <>
              <span className="text-zinc-500">
                Kalan{" "}
                <span className="font-normal text-xs">(maliyet düşülmedi)</span>
              </span>
              <span className={remainingAfterKnown >= 0 ? "text-emerald-700" : "text-red-600"}>
                {formatTry(remainingAfterKnown)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Marj bilgisi */}
      {hasCost && estimate.grossMarginPercent != null ? (
        <p className="mt-2 text-xs text-emerald-900">
          Brüt marj: %{estimate.grossMarginPercent}
          {estimate.netMarginPercent != null ? ` · Net marj: %${estimate.netMarginPercent}` : ""}
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-700">
          Net kâr için ürün maliyetini girin.
        </p>
      )}
    </div>
  );
}
