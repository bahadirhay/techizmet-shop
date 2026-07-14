import "server-only";

import { createFaturaClient } from "fatura";
import { buildInvoiceDetailsFromOrder } from "@/lib/efatura/build-invoice";
import { renderInvoicePreviewHtml } from "@/lib/efatura/render-invoice-preview-html";
import {
  efaturaReady,
  getEfaturaConfig,
  type ResolvedEfaturaConfig,
} from "@/lib/efatura/settings";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings } from "@/lib/site-settings";
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

type GibSellerProfile = {
  fullAddress?: string;
  buildingName?: string;
  buildingNumber?: string;
  doorNumber?: string;
  town?: string;
  district?: string;
  city?: string;
  zipCode?: string;
};

/** GİB mükellef profilini açık adres satırına çevirir. */
function formatSellerAddress(u: GibSellerProfile): string {
  const streetLine = [u.fullAddress, u.buildingName].map((s) => s?.trim()).filter(Boolean).join(" ");
  const noLine = [
    u.buildingNumber?.trim() ? `No:${u.buildingNumber.trim()}` : "",
    u.doorNumber?.trim() ? `D:${u.doorNumber.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return [
    [streetLine, noLine].filter(Boolean).join(" "),
    u.town?.trim(),
    u.district?.trim(),
    u.city?.trim(),
    u.zipCode?.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Ön izlemede gösterilecek satıcı adresini çözer: önce ayar önbelleği, yoksa
 * GİB mükellef profilinden (getUserData) bir kez çekip ayarlara önbellekler.
 * GİB'e erişilemezse boş döner (ön izleme adressiz de çalışır).
 */
async function resolveSellerAddress(
  siteId: string,
  config: ResolvedEfaturaConfig,
): Promise<string> {
  if (config.sellerAddress) return config.sellerAddress;
  if (!efaturaReady(config)) return "";
  try {
    const client = createFaturaClient(config.testMode ? "TEST" : "PROD");
    const token = await client.getToken(config.username, config.password);
    let address = "";
    try {
      const profile = (await client.getUserData(token)) as GibSellerProfile;
      address = formatSellerAddress(profile);
    } finally {
      await client.logout(token);
    }
    if (address) {
      const site = await prisma.storeSite.findUnique({
        where: { id: siteId },
        select: { settingsJson: true },
      });
      const current = parseSiteSettings(site?.settingsJson ?? null);
      const next = mergeSiteSettings(current, {
        efatura: { ...current.efatura, sellerAddress: address },
      });
      await prisma.storeSite.update({
        where: { id: siteId },
        data: { settingsJson: JSON.stringify(next) },
      });
    }
    return address;
  } catch {
    return "";
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
  const sellerAddress = await resolveSellerAddress(siteId, config);
  const html = renderInvoicePreviewHtml(details, {
    storeName,
    sellerTitle: config.sellerTitle || storeName,
    sellerTaxId: config.sellerTaxId,
    sellerTaxOffice: config.sellerTaxOffice,
    sellerAddress,
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
