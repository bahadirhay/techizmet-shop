import "server-only";

import { createFaturaClient } from "fatura";
import { nanoid } from "nanoid";
import { buildInvoiceDetailsFromOrder } from "@/lib/efatura/build-invoice";
import { efaturaReady, getEfaturaConfig, type ResolvedEfaturaConfig } from "@/lib/efatura/settings";
import { sendMarketplaceInvoice } from "@/lib/marketplace/actions";
import { prisma } from "@/lib/prisma";
import { syncKdvFromInvoiceDate } from "@/lib/finance/kdv-sync";
import { syncGeciciObligations } from "@/lib/finance/gecici-sync";
import { getTaxConfig } from "@/lib/finance/tax";
import { parseSiteSettings } from "@/lib/site-settings";

export type OrderInvoiceMeta = {
  publicToken?: string;
  gibDownloadUrl?: string;
  recipientTaxId?: string;
  signed?: boolean;
  marketplaceSent?: boolean;
  error?: string;
};

export type IssueOrderInvoiceResult = {
  ok: boolean;
  message: string;
  invoiceNumber?: string;
  invoiceUuid?: string;
  invoiceLink?: string;
  signed?: boolean;
};

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:5555").replace(
    /\/$/,
    "",
  );
}

function parseInvoiceMeta(raw: string | null | undefined): OrderInvoiceMeta {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as OrderInvoiceMeta;
  } catch {
    return {};
  }
}

function extractDocumentNumber(found: Record<string, unknown> | undefined): string | undefined {
  if (!found) return undefined;
  const keys = ["belgeNumarasi", "faturaNo", "invoiceNumber", "documentNumber"];
  for (const k of keys) {
    const v = found[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

export async function issueOrderInvoice(
  siteId: string,
  orderId: string,
  options: {
    recipientTaxId?: string;
    sign?: boolean;
    sendToMarketplace?: boolean;
    force?: boolean;
  } = {},
): Promise<IssueOrderInvoiceResult> {
  const config = await getEfaturaConfig(siteId);
  if (!efaturaReady(config)) {
    return {
      ok: false,
      message: "e-Arşiv ayarları eksik. Ayarlar → e-Fatura bölümünden GİB kullanıcı kodu ve parolasını girin.",
    };
  }

  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { lines: true },
  });
  if (!order) return { ok: false, message: "Sipariş bulunamadı" };

  if (order.invoiceStatus === "signed" && !options.force) {
    return {
      ok: false,
      message: "Bu sipariş için fatura zaten kesilmiş.",
      invoiceNumber: order.invoiceNumber ?? undefined,
      invoiceUuid: order.invoiceUuid ?? undefined,
      invoiceLink: order.invoiceLink ?? undefined,
    };
  }

  const invoiceDetails = buildInvoiceDetailsFromOrder(order, config, options.recipientTaxId);
  const sign = options.sign ?? config.autoSign;
  const client = createFaturaClient(config.testMode ? "TEST" : "PROD");

  try {
    const token = await client.getToken(config.username, config.password);
    const draft = await client.createDraftInvoice(token, invoiceDetails);
    const found = await client.findInvoice(token, draft);
    let signed = false;
    let invoiceNumber = extractDocumentNumber(found as Record<string, unknown> | undefined);

    if (sign && found) {
      try {
        await client.signDraftInvoice(token, found);
        signed = true;
        const afterSign = await client.findInvoice(token, draft);
        invoiceNumber = extractDocumentNumber(afterSign as Record<string, unknown> | undefined) ?? invoiceNumber;
      } catch (signErr) {
        const msg = signErr instanceof Error ? signErr.message : String(signErr);
        await client.logout(token);
        return {
          ok: false,
          message: `Taslak oluşturuldu ancak imzalanamadı (SMS doğrulama gerekebilir): ${msg}. GİB portalından imzalayabilirsiniz.`,
          invoiceUuid: draft.uuid,
        };
      }
    }

    const publicToken = parseInvoiceMeta(order.invoiceMetaJson).publicToken ?? nanoid(24);
    const gibDownloadUrl = client.getDownloadURL(token, draft.uuid, { signed });
    await client.logout(token);

    const invoiceLink = `${siteBaseUrl()}/api/public/invoice/${publicToken}`;
    const invoiceUuid = draft.uuid;
    const status = signed ? "signed" : "draft";

    const meta: OrderInvoiceMeta = {
      publicToken,
      gibDownloadUrl,
      recipientTaxId: options.recipientTaxId ?? config.defaultConsumerTaxId,
      signed,
    };

    await prisma.storeOrder.update({
      where: { id: orderId },
      data: {
        invoiceNumber: invoiceNumber ?? `DRAFT-${order.orderNumber}`.slice(0, 32),
        invoiceUuid,
        invoiceLink,
        invoiceStatus: status,
        invoiceIssuedAt: new Date(),
        invoiceMetaJson: JSON.stringify(meta),
        adminNotes: [order.adminNotes, `e-Arşiv: ${invoiceNumber ?? invoiceUuid}`].filter(Boolean).join(" · "),
      },
    });

    let message = signed
      ? `e-Arşiv faturası kesildi ve imzalandı (${invoiceNumber ?? invoiceUuid})`
      : `e-Arşiv taslak faturası oluşturuldu (${invoiceUuid}). GİB portalından imzalayın.`;

    const shouldSendMarketplace =
      (options.sendToMarketplace ?? config.autoSendMarketplace) &&
      Boolean(order.marketplacePlatform && order.marketplaceMetaJson);

    if (shouldSendMarketplace) {
      const mp = await sendMarketplaceInvoice(siteId, orderId, {
        invoiceLink,
        invoiceNumber: invoiceNumber ?? undefined,
      });
      if (mp.ok) {
        meta.marketplaceSent = true;
        await prisma.storeOrder.update({
          where: { id: orderId },
          data: {
            invoiceStatus: "marketplace_sent",
            invoiceMetaJson: JSON.stringify(meta),
          },
        });
        message += ` · ${mp.message}`;
      } else {
        message += ` · Pazaryeri: ${mp.message}`;
      }
    }

    // InvoiceEntry bridge — sipariş faturasını KDV takibine ekle
    try {
      const dedupKey = `order:${order.orderNumber}`;
      const entryExists = await prisma.invoiceEntry.findFirst({
        where: { siteId, invoiceNo: dedupKey },
        select: { id: true },
      });
      if (!entryExists) {
        const defaultRate = config.defaultVatRate;
        // Satırları KDV oranına göre grupla
        const rateGroups = new Map<number, number>(); // rate → netMinor
        for (const l of order.lines) {
          const rate = l.vatRate ?? defaultRate;
          const normalRate = rate <= 2 ? 1 : rate <= 15 ? 10 : 20;
          const lineNet = Math.max(0, l.lineMinor - (l.discountMinor ?? 0));
          rateGroups.set(normalRate, (rateGroups.get(normalRate) ?? 0) + lineNet);
        }
        if (order.shippingMinor > 0) {
          const sr = defaultRate <= 2 ? 1 : defaultRate <= 15 ? 10 : 20;
          rateGroups.set(sr, (rateGroups.get(sr) ?? 0) + order.shippingMinor);
        }
        for (const [rate, lineTotal] of rateGroups) {
          // lineTotal burada KDV dahil (order.lineMinor = total incl. VAT)
          const netMinor = Math.round(lineTotal / (1 + rate / 100));
          const kdvMinor = lineTotal - netMinor;
          await prisma.invoiceEntry.create({
            data: {
              siteId,
              direction: "outgoing",
              invoiceDate: order.createdAt,
              invoiceNo: rateGroups.size > 1 ? `${dedupKey}:r${rate}` : dedupKey,
              counterparty: order.customerName?.trim() || "Tüketici",
              netMinor,
              kdvRate: rate as 1 | 10 | 20,
              kdvMinor,
              description: `${order.marketplacePlatform ? order.marketplacePlatform + " · " : ""}Sipariş #${order.orderNumber}`,
            },
          });
        }
        // Obligations senkronize et
        const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { settingsJson: true } });
        const taxConfig = getTaxConfig(parseSiteSettings(site?.settingsJson ?? null));
        await syncKdvFromInvoiceDate(siteId, order.createdAt);
        await syncGeciciObligations(siteId, order.createdAt.getUTCFullYear(), taxConfig.incomeBrackets);
      }
    } catch (kdvErr) {
      console.error("[invoice-entry-bridge]", kdvErr);
    }

    return {
      ok: true,
      message,
      invoiceNumber: invoiceNumber ?? undefined,
      invoiceUuid,
      invoiceLink,
      signed,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `GİB hatası: ${msg}` };
  }
}

export async function getPublicInvoiceHtml(publicToken: string): Promise<string | null> {
  const orders = await prisma.storeOrder.findMany({
    where: { invoiceMetaJson: { contains: publicToken } },
    take: 5,
    select: {
      id: true,
      siteId: true,
      invoiceUuid: true,
      invoiceMetaJson: true,
      invoiceStatus: true,
    },
  });

  const order = orders.find((o) => parseInvoiceMeta(o.invoiceMetaJson).publicToken === publicToken);
  if (!order?.invoiceUuid) return null;

  const config = await getEfaturaConfig(order.siteId);
  if (!efaturaReady(config)) return null;

  const meta = parseInvoiceMeta(order.invoiceMetaJson);
  const client = createFaturaClient(config.testMode ? "TEST" : "PROD");
  try {
    const token = await client.getToken(config.username, config.password);
    const html = await client.getInvoiceHTML(token, order.invoiceUuid, { signed: meta.signed === true });
    await client.logout(token);
    return html;
  } catch {
    return null;
  }
}
