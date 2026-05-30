import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolRequest } from "@/lib/marketplace/trendyol/client";

export async function updateTrendyolPackageStatus(
  creds: TrendyolCredentials,
  packageId: number,
  status: "Picking" | "Invoiced",
  lines: { lineId: number; quantity: number }[],
  params: { invoiceNumber?: string } = {},
): Promise<{ ok: boolean; message: string }> {
  if (!lines.length) {
    return { ok: false, message: "Paket satır bilgisi yok" };
  }

  const path = `/integration/order/sellers/${creds.sellerId}/shipment-packages/${packageId}`;
  const body: Record<string, unknown> = {
    status,
    lines: lines.map((l) => ({ lineId: l.lineId, quantity: l.quantity })),
    params: status === "Invoiced" && params.invoiceNumber ? { invoiceNumber: params.invoiceNumber } : {},
  };

  const res = await trendyolRequest(creds, path, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) {
    return {
      ok: false,
      message: `Trendyol paket ${status} HTTP ${res.status}: ${res.text.slice(0, 300)}`,
    };
  }
  return { ok: true, message: `Trendyol paketi ${status} olarak bildirildi` };
}

export async function approveTrendyolPackage(
  creds: TrendyolCredentials,
  packageId: number,
  lines: { lineId: number; quantity: number }[],
): Promise<{ ok: boolean; message: string }> {
  return updateTrendyolPackageStatus(creds, packageId, "Picking", lines);
}

export async function invoiceTrendyolPackage(
  creds: TrendyolCredentials,
  packageId: number,
  lines: { lineId: number; quantity: number }[],
  invoiceNumber: string,
): Promise<{ ok: boolean; message: string }> {
  return updateTrendyolPackageStatus(creds, packageId, "Invoiced", lines, { invoiceNumber });
}
