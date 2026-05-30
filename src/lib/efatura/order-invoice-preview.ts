import "server-only";

import { createFaturaClient } from "fatura";
import { buildInvoiceDetailsFromOrder } from "@/lib/efatura/build-invoice";
import { renderInvoicePreviewHtml } from "@/lib/efatura/render-invoice-preview-html";
import { efaturaReady, getEfaturaConfig } from "@/lib/efatura/settings";
import { prisma } from "@/lib/prisma";

export type OrderInvoicePreviewResult = {
  ok: boolean;
  message?: string;
  html?: string;
  /** Yerel ön izleme mi, GİB'ten çekilen kesilmiş fatura mı */
  source?: "local" | "gib";
  issued?: boolean;
  orderNumber?: string;
  grandTotalInclVAT?: number;
  recipientTaxId?: string;
  itemCount?: number;
};

function parseInvoiceMeta(raw: string | null | undefined): { signed?: boolean } {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as { signed?: boolean };
  } catch {
    return {};
  }
}

async function fetchGibInvoiceHtml(
  siteId: string,
  invoiceUuid: string,
  invoiceMetaJson: string | null,
): Promise<string | null> {
  const config = await getEfaturaConfig(siteId);
  if (!efaturaReady(config)) return null;

  const meta = parseInvoiceMeta(invoiceMetaJson);
  const client = createFaturaClient(config.testMode ? "TEST" : "PROD");
  try {
    const token = await client.getToken(config.username, config.password);
    const html = await client.getInvoiceHTML(token, invoiceUuid, { signed: meta.signed === true });
    await client.logout(token);
    return html;
  } catch {
    return null;
  }
}

export async function buildOrderInvoicePreview(
  siteId: string,
  orderId: string,
  options: { recipientTaxId?: string } = {},
): Promise<OrderInvoicePreviewResult> {
  const config = await getEfaturaConfig(siteId);

  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { lines: true, site: { select: { name: true } } },
  });
  if (!order) return { ok: false, message: "Sipariş bulunamadı" };

  const storeName = order.site?.name?.trim() || "Mağaza";
  const issued = Boolean(order.invoiceUuid && order.invoiceStatus && order.invoiceStatus !== "none");

  if (order.invoiceUuid) {
    const gibHtml = await fetchGibInvoiceHtml(siteId, order.invoiceUuid, order.invoiceMetaJson);
    if (gibHtml) {
      return {
        ok: true,
        html: gibHtml,
        source: "gib",
        issued: true,
        orderNumber: order.orderNumber,
      };
    }
  }

  const details = buildInvoiceDetailsFromOrder(order, config, options.recipientTaxId);
  const html = renderInvoicePreviewHtml(details, {
    storeName,
    sellerTitle: config.sellerTitle || storeName,
    sellerTaxId: config.sellerTaxId,
    sellerTaxOffice: config.sellerTaxOffice,
    testMode: config.testMode,
  });

  return {
    ok: true,
    html,
    source: "local",
    issued,
    orderNumber: order.orderNumber,
    grandTotalInclVAT: details.grandTotalInclVAT,
    recipientTaxId: options.recipientTaxId?.trim() || config.defaultConsumerTaxId,
    itemCount: details.items.length,
  };
}
