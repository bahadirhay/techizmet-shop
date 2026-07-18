"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  marketplacePlatformLabel,
  marketplacePlatformShort,
} from "@/lib/admin/marketplace-listing-labels";

const STORAGE_KEY = "marketplace-sync-alert";

export type MarketplaceSyncAlertPayload = {
  title: string;
  stalePlatforms: string[];
  notListedPlatforms: string[];
  needsAttentionPlatforms: string[];
};

export function MarketplaceSyncAlertBanner() {
  const [alert, setAlert] = useState<MarketplaceSyncAlertPayload | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORAGE_KEY);
      const parsed = JSON.parse(raw) as MarketplaceSyncAlertPayload;
      if (parsed?.title) setAlert(parsed);
    } catch {
      /* geçersiz */
    }
  }, []);

  if (!alert) return null;

  const hasIssue =
    alert.stalePlatforms.length > 0 ||
    alert.notListedPlatforms.length > 0 ||
    alert.needsAttentionPlatforms.length > 0;

  if (!hasIssue) {
    return (
      <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
        <strong>{alert.title}</strong> kaydedildi. Bağlı pazaryerlerinde içerik güncel görünüyor.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">
        <strong>{alert.title}</strong> mağazada kaydedildi — pazaryeri güncellemesi gerekebilir:
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {alert.stalePlatforms.length > 0 ? (
          <li>
            Güncelleme bekliyor:{" "}
            {alert.stalePlatforms.map((p) => marketplacePlatformLabel(p)).join(", ")}
          </li>
        ) : null}
        {alert.notListedPlatforms.length > 0 ? (
          <li>
            Pazaryerinde yok:{" "}
            {alert.notListedPlatforms.map((p) => marketplacePlatformLabel(p)).join(", ")}
          </li>
        ) : null}
        {alert.needsAttentionPlatforms.length > 0 ? (
          <li>
            Hata / dikkat:{" "}
            {alert.needsAttentionPlatforms.map((p) => marketplacePlatformLabel(p)).join(", ")}
          </li>
        ) : null}
      </ul>
      <p className="mt-2 text-xs text-amber-800">
        Pazaryeri → ilgili platform → ürün gönder / güncelle. Aşağıdaki filtrelerle tüm bekleyen
        ürünleri listeleyebilirsiniz.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {alert.stalePlatforms.includes("trendyol") || alert.notListedPlatforms.includes("trendyol") ? (
          <Link
            href="/admin/integrations?platform=trendyol"
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-amber-100"
          >
            Trendyol ({marketplacePlatformShort("trendyol")})
          </Link>
        ) : null}
        {alert.stalePlatforms.includes("amazon_tr") || alert.notListedPlatforms.includes("amazon_tr") ? (
          <Link
            href="/admin/integrations?platform=amazon_tr"
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-amber-100"
          >
            Amazon ({marketplacePlatformShort("amazon_tr")})
          </Link>
        ) : null}
        {alert.stalePlatforms.includes("hepsiburada") ||
        alert.notListedPlatforms.includes("hepsiburada") ? (
          <Link
            href="/admin/integrations?platform=hepsiburada"
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-amber-100"
          >
            Hepsiburada ({marketplacePlatformShort("hepsiburada")})
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function storeMarketplaceSyncAlert(payload: MarketplaceSyncAlertPayload) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* depolama dolu */
  }
}
