import {
  amazonSpApiRequest,
  getAmazonAccessToken,
  resolveAmazonMarketplaceId,
  type AmazonSpApiCredentials,
} from "@/lib/marketplace/amazon/client";

export type AmazonInvoiceUploadInput = {
  /** Amazon sipariş no (403-…) */
  amazonOrderId: string;
  invoiceNumber: string;
  /** PDF baytları */
  pdf: Buffer;
  /** KDV dahil toplam (TRY, örn. "777.88") */
  totalAmount: string;
  /** Toplam KDV (TRY, örn. "129.65") */
  totalVatAmount: string;
  marketplaceId?: string;
  documentType?: "Invoice" | "CreditNote";
};

function minorToTryFixed(minor: number): string {
  return (Math.max(0, Math.round(minor)) / 100).toFixed(2);
}

/** Satır bazlı KDV dahil tutarlardan toplam KDV (kuruş). */
export function estimateVatMinorFromGrossLines(
  lines: { lineMinor: number; vatRate: number | null | undefined }[],
  fallbackRate = 20,
): number {
  let vat = 0;
  for (const line of lines) {
    const rate = line.vatRate != null && line.vatRate > 0 ? line.vatRate : fallbackRate;
    const gross = Math.max(0, line.lineMinor);
    const net = Math.round(gross / (1 + rate / 100));
    vat += gross - net;
  }
  return Math.max(0, vat);
}

export function formatAmazonMoneyFromMinor(minor: number): string {
  return minorToTryFixed(minor);
}

/**
 * Amazon.com.tr — UPLOAD_VAT_INVOICE feed.
 * 1) createFeedDocument  2) PDF PUT  3) createFeed
 */
export async function uploadAmazonVatInvoice(
  creds: AmazonSpApiCredentials,
  config: Record<string, string>,
  input: AmazonInvoiceUploadInput,
): Promise<{ ok: boolean; feedId?: string; message: string }> {
  const tokenResult = await getAmazonAccessToken(creds);
  if (!tokenResult.accessToken) {
    return { ok: false, message: `Amazon auth: ${tokenResult.error ?? "token yok"}` };
  }
  const accessToken = tokenResult.accessToken;
  const marketplaceId = input.marketplaceId ?? resolveAmazonMarketplaceId(config);

  if (!input.pdf.length) {
    return { ok: false, message: "PDF boş" };
  }
  if (!input.amazonOrderId.trim()) {
    return { ok: false, message: "Amazon sipariş numarası yok" };
  }
  if (!input.invoiceNumber.trim()) {
    return { ok: false, message: "Fatura numarası yok" };
  }

  const docRes = await amazonSpApiRequest(creds, accessToken, "/feeds/2021-06-30/documents", {
    method: "POST",
    body: { contentType: "application/pdf" },
  });
  if (!docRes.ok) {
    return {
      ok: false,
      message: `Amazon createFeedDocument HTTP ${docRes.status}: ${docRes.text.slice(0, 280)}`,
    };
  }

  const doc = docRes.json as { feedDocumentId?: string; url?: string } | null;
  const feedDocumentId = doc?.feedDocumentId?.trim();
  const uploadUrl = doc?.url?.trim();
  if (!feedDocumentId || !uploadUrl) {
    return { ok: false, message: "Amazon feed document yanıtı eksik (id/url)" };
  }

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: new Uint8Array(input.pdf),
  });
  if (!putRes.ok) {
    const putText = await putRes.text().catch(() => "");
    return {
      ok: false,
      message: `Amazon PDF yükleme HTTP ${putRes.status}: ${putText.slice(0, 280)}`,
    };
  }

  const feedRes = await amazonSpApiRequest(creds, accessToken, "/feeds/2021-06-30/feeds", {
    method: "POST",
    body: {
      feedType: "UPLOAD_VAT_INVOICE",
      marketplaceIds: [marketplaceId],
      inputFeedDocumentId: feedDocumentId,
      feedOptions: {
        "metadata:OrderId": input.amazonOrderId.trim(),
        "metadata:InvoiceNumber": input.invoiceNumber.trim(),
        "metadata:DocumentType": input.documentType ?? "Invoice",
        "metadata:TotalAmount": input.totalAmount,
        "metadata:TotalVATAmount": input.totalVatAmount,
      },
    },
  });

  if (!feedRes.ok) {
    return {
      ok: false,
      message: `Amazon createFeed HTTP ${feedRes.status}: ${feedRes.text.slice(0, 280)}`,
    };
  }

  const feed = feedRes.json as { feedId?: string } | null;
  const feedId = feed?.feedId?.trim();
  return {
    ok: true,
    feedId,
    message: feedId
      ? `Amazon fatura feed oluşturuldu (${feedId})`
      : "Amazon fatura feed oluşturuldu",
  };
}
