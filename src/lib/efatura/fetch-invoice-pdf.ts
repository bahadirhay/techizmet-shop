import "server-only";

import { createFaturaClient } from "fatura";
import { parseInvoiceMeta } from "@/lib/efatura/order-invoice";
import { efaturaReady, getEfaturaConfig } from "@/lib/efatura/settings";

/**
 * GİB e-Arşiv'den imzalı fatura PDF baytlarını çeker (taze token ile).
 * Token'lı saklı gibDownloadUrl süresi dolmuş olabilir; her seferinde yenilenir.
 */
export async function fetchSignedInvoicePdfBytes(
  siteId: string,
  order: {
    invoiceUuid: string | null;
    invoiceStatus: string | null;
    invoiceMetaJson: string | null;
  },
): Promise<{ ok: true; pdf: Buffer } | { ok: false; message: string }> {
  if (!order.invoiceUuid?.trim()) {
    return { ok: false, message: "Fatura UUID yok — önce GİB e-Arşiv kesimi gerekli" };
  }
  const meta = parseInvoiceMeta(order.invoiceMetaJson);
  const signed =
    meta.signed === true ||
    order.invoiceStatus === "signed" ||
    order.invoiceStatus === "marketplace_sent";
  if (!signed) {
    return { ok: false, message: "Fatura henüz imzalanmamış; Amazon'a yalnızca imzalı PDF gönderilir" };
  }

  const config = await getEfaturaConfig(siteId);
  if (!efaturaReady(config)) {
    return { ok: false, message: "GİB e-Arşiv ayarları eksik" };
  }

  const client = createFaturaClient(config.testMode ? "TEST" : "PROD");
  try {
    const token = await client.getToken(config.username, config.password);
    const url = client.getDownloadURL(token, order.invoiceUuid, { signed: true });
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/pdf,*/*",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    await client.logout(token).catch(() => undefined);

    if (!res.ok) {
      return {
        ok: false,
        message: `GİB PDF indirme HTTP ${res.status}`,
      };
    }
    // GİB bazen HTML hata sayfası döner
    const head = buf.subarray(0, 5).toString("utf8");
    if (head !== "%PDF-") {
      return {
        ok: false,
        message:
          "GİB PDF yerine beklenmeyen içerik döndü. PDF’i elle yükleyip Amazon’a göndermeyi deneyin.",
      };
    }
    return { ok: true, pdf: buf };
  } catch (e) {
    const detail = e instanceof Error ? e.message : "GİB PDF hatası";
    return { ok: false, message: detail.slice(0, 240) };
  }
}
