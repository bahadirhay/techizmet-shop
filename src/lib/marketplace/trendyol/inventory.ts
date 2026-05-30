import { minorToTry } from "@/lib/admin/money";
import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolLegacyProductBase, trendyolRequest } from "@/lib/marketplace/trendyol/client";

export async function syncTrendyolPriceAndInventory(
  creds: TrendyolCredentials,
  items: { barcode: string; quantity: number; salePriceMinor: number; listPriceMinor: number }[],
): Promise<{ ok: boolean; sent: number; message: string }> {
  const eligible = items.filter((i) => i.barcode?.trim()).slice(0, 1000);
  if (!eligible.length) {
    return { ok: false, sent: 0, message: "Stok/fiyat güncellenecek barkodlu ürün yok" };
  }

  const body = {
    items: eligible.map((i) => ({
      barcode: i.barcode.trim(),
      quantity: Math.min(Math.max(0, i.quantity), 9999),
      salePrice: Number(minorToTry(i.salePriceMinor)),
      listPrice: Number(minorToTry(i.listPriceMinor)),
    })),
  };

  const path = `/integration/inventory/sellers/${creds.sellerId}/products/price-and-inventory`;
  const res = await trendyolRequest(creds, path, { method: "POST", body: JSON.stringify(body) });

  if (!res.ok) {
    return {
      ok: false,
      sent: 0,
      message: `Trendyol stok/fiyat HTTP ${res.status}: ${res.text.slice(0, 300)}`,
    };
  }

  const batch =
    res.json && typeof res.json === "object" && "batchRequestId" in res.json
      ? String((res.json as { batchRequestId?: string }).batchRequestId ?? "")
      : "";
  return {
    ok: true,
    sent: eligible.length,
    message: `${eligible.length} ürün stok/fiyat güncellendi${batch ? ` · batch: ${batch}` : ""}`,
  };
}

/** Ürün oluşturma — legacy sapigw endpoint */
export async function trendyolProductCreateUrl(creds: TrendyolCredentials): string {
  return `${trendyolLegacyProductBase(creds)}/sapigw/suppliers/${creds.sellerId}/v2/products`;
}

export { trendyolRequest };
