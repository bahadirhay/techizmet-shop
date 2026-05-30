import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { trendyolRequest } from "@/lib/marketplace/trendyol/client";

export async function sendTrendyolInvoiceLink(
  creds: TrendyolCredentials,
  input: {
    shipmentPackageId: number;
    invoiceLink: string;
    invoiceNumber?: string;
    invoiceDateTime?: number;
  },
): Promise<{ ok: boolean; message: string }> {
  const path = `/integration/sellers/${creds.sellerId}/seller-invoice-links`;
  const body: Record<string, unknown> = {
    shipmentPackageId: input.shipmentPackageId,
    invoiceLink: input.invoiceLink.trim(),
  };
  if (input.invoiceNumber) body.invoiceNumber = input.invoiceNumber;
  if (input.invoiceDateTime) body.invoiceDateTime = input.invoiceDateTime;

  const res = await trendyolRequest(creds, path, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) {
    return {
      ok: false,
      message: `Trendyol fatura linki HTTP ${res.status}: ${res.text.slice(0, 300)}`,
    };
  }
  return { ok: true, message: "Fatura linki Trendyol'a gönderildi" };
}
