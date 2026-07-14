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
  /** Sipariş fatura durumu: none/draft/signed/marketplace_sent */
  invoiceStatus?: string | null;
  /** GİB'de imzalı/onaylı mı */
  signed?: boolean;
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
  email?: string;
  phoneNumber?: string;
};

type SellerProfile = { address: string; email: string; phone: string };

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
 * Ön izlemede gösterilecek satıcı bilgilerini (adres + e-posta + telefon) çözer:
 * önce ayar önbelleği, yoksa GİB mükellef profilinden (getUserData) bir kez çekip
 * ayarlara önbellekler. GİB'e erişilemezse eldeki önbellekle döner.
 */
async function resolveSellerProfile(
  siteId: string,
  config: ResolvedEfaturaConfig,
): Promise<SellerProfile> {
  const cached: SellerProfile = {
    address: config.sellerAddress,
    email: config.sellerEmail,
    phone: config.sellerPhone,
  };
  if (config.sellerProfileCached) return cached;
  if (!efaturaReady(config)) return cached;
  try {
    const client = createFaturaClient(config.testMode ? "TEST" : "PROD");
    const token = await client.getToken(config.username, config.password);
    const resolved: SellerProfile = { address: "", email: "", phone: "" };
    try {
      const profile = (await client.getUserData(token)) as GibSellerProfile;
      resolved.address = formatSellerAddress(profile);
      resolved.email = profile.email?.trim() ?? "";
      resolved.phone = profile.phoneNumber?.trim() ?? "";
    } finally {
      await client.logout(token);
    }
    const site = await prisma.storeSite.findUnique({
      where: { id: siteId },
      select: { settingsJson: true },
    });
    const current = parseSiteSettings(site?.settingsJson ?? null);
    const next = mergeSiteSettings(current, {
      efatura: {
        ...current.efatura,
        sellerAddress: resolved.address,
        sellerEmail: resolved.email,
        sellerPhone: resolved.phone,
        sellerProfileCached: true,
      },
    });
    await prisma.storeSite.update({
      where: { id: siteId },
      data: { settingsJson: JSON.stringify(next) },
    });
    return resolved;
  } catch {
    return cached;
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
  const meta = parseInvoiceMeta(order.invoiceMetaJson);
  const issued = Boolean(order.invoiceUuid && order.invoiceStatus && order.invoiceStatus !== "none");
  const isFinalized =
    order.invoiceStatus === "signed" ||
    order.invoiceStatus === "marketplace_sent" ||
    meta.signed === true;

  // Yalnızca imzalanmış (kesilmiş) faturada GİB'den resmi HTML çek. Taslakta yerel ön izleme
  // gösterilir; böylece gereksiz GİB girişi olmaz ve "onayı kontrol et" butonu görünür kalır.
  if (order.invoiceUuid && isFinalized) {
    const gibHtml = await fetchGibInvoiceHtml(siteId, order.invoiceUuid, order.invoiceMetaJson);
    if (gibHtml) {
      return {
        ok: true,
        html: gibHtml,
        source: "gib",
        issued: true,
        orderNumber: order.orderNumber,
        invoiceStatus: order.invoiceStatus,
        signed: true,
      };
    }
  }

  const details = buildInvoiceDetailsFromOrder(order, config, options.recipientTaxId);
  const sellerProfile = await resolveSellerProfile(siteId, config);
  const html = renderInvoicePreviewHtml(details, {
    storeName,
    sellerTitle: config.sellerTitle || storeName,
    sellerTaxId: config.sellerTaxId,
    sellerTaxOffice: config.sellerTaxOffice,
    sellerAddress: sellerProfile.address,
    sellerEmail: sellerProfile.email,
    sellerPhone: sellerProfile.phone,
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
    invoiceStatus: order.invoiceStatus,
    signed: meta.signed === true,
  };
}
