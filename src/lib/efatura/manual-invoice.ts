import "server-only";

import { createFaturaClient } from "fatura";
import type { InvoiceDetails, InvoiceItem } from "fatura";
import { efaturaReady, getEfaturaConfig } from "@/lib/efatura/settings";
import { normalizeConsumerTaxId } from "@/lib/efatura/consumer-tax-id";
import { prisma } from "@/lib/prisma";
import { syncKdvFromInvoiceDate } from "@/lib/finance/kdv-sync";
import { syncGeciciObligations } from "@/lib/finance/gecici-sync";
import { getTaxConfig } from "@/lib/finance/tax";
import { parseSiteSettings } from "@/lib/site-settings";

export type ManualInvoiceLine = {
  description: string;
  qty: number;
  unitPriceTl: number; // KDV hariç birim fiyat (TL)
  vatRate: number;     // 0, 1, 10 veya 20
};

export type ManualInvoiceInput = {
  recipientName: string;
  recipientTaxId?: string;
  recipientTaxOffice?: string;
  recipientAddress?: string;
  recipientCity?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  lines: ManualInvoiceLine[];
  invoiceDate?: Date;
  description?: string; // İç not, InvoiceEntry açıklaması için
};

export type ManualInvoiceResult = {
  ok: boolean;
  message: string;
  invoiceNumber?: string;
  invoiceUuid?: string;
  downloadUrl?: string;
  signed?: boolean;
  entryId?: string;
};

function round2(n: number) { return Math.round(n * 100) / 100; }

function buildItems(lines: ManualInvoiceLine[]): {
  items: InvoiceItem[];
  grandTotal: number;
  totalVAT: number;
  grandTotalInclVAT: number;
} {
  const items: InvoiceItem[] = lines.map((l) => {
    const unitEx = round2(l.unitPriceTl);
    const lineEx = round2(unitEx * l.qty);
    const vat = round2(lineEx * l.vatRate / 100);
    return {
      name: l.description.slice(0, 200),
      quantity: l.qty,
      unitPrice: unitEx,
      price: lineEx,
      VATRate: l.vatRate,
      VATAmount: vat,
    };
  });

  const grandTotal = round2(items.reduce((s, i) => s + (i.price ?? 0), 0));
  const totalVAT = round2(items.reduce((s, i) => s + (i.VATAmount ?? 0), 0));
  const grandTotalInclVAT = round2(grandTotal + totalVAT);
  return { items, grandTotal, totalVAT, grandTotalInclVAT };
}

function formatGibDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  };
}

function extractDocumentNumber(found: Record<string, unknown> | undefined): string | undefined {
  if (!found) return undefined;
  for (const k of ["belgeNumarasi", "faturaNo", "invoiceNumber", "documentNumber"]) {
    const v = found[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

export async function issueManualInvoice(
  siteId: string,
  input: ManualInvoiceInput,
  actorUserId?: string | null,
): Promise<ManualInvoiceResult> {
  const config = await getEfaturaConfig(siteId);
  if (!efaturaReady(config)) {
    return {
      ok: false,
      message: "e-Arşiv ayarları eksik. Ayarlar → e-Fatura bölümünden GİB kullanıcı adı ve parolasını girin.",
    };
  }

  if (!input.lines.length) return { ok: false, message: "En az bir fatura satırı gerekli." };

  const issueDate = input.invoiceDate ?? new Date();
  const { date, time } = formatGibDate(issueDate);
  const { items, grandTotal, totalVAT, grandTotalInclVAT } = buildItems(input.lines);

  const nameParts = input.recipientName.trim().split(/\s+/);
  const taxId = normalizeConsumerTaxId(
    input.recipientTaxId?.trim(),
    config.defaultConsumerTaxId,
  );

  const invoiceDetails: InvoiceDetails = {
    date,
    time,
    orderNumber: `MF-${Date.now()}`.slice(0, 16),
    taxIDOrTRID: taxId,
    taxOffice: input.recipientTaxOffice?.trim() ?? "",
    title: input.recipientName.trim(),
    name: nameParts.length > 1 ? nameParts[0]! : "",
    surname: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
    fullAddress: input.recipientAddress?.trim() ?? "Türkiye",
    city: input.recipientCity?.trim() ?? "",
    district: "",
    zipCode: "",
    phoneNumber: input.recipientPhone?.trim() ?? "",
    email: input.recipientEmail?.trim() ?? "",
    items,
    totalVAT,
    grandTotal,
    grandTotalInclVAT,
    paymentTotal: grandTotalInclVAT,
  };

  const clientAny = createFaturaClient(config.testMode ? "TEST" : "PROD") as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  const client = clientAny as typeof createFaturaClient extends (...args: unknown[]) => infer R ? R : never;

  let invoiceNumber: string | undefined;
  let invoiceUuid: string | undefined;
  let downloadUrl: string | undefined;
  let signed = false;

  try {
    const token = await (client as unknown as { getToken: (u: string, p: string) => Promise<unknown> }).getToken(config.username, config.password);
    const draft = await (client as unknown as { createDraftInvoice: (t: unknown, d: InvoiceDetails) => Promise<{ uuid: string }> }).createDraftInvoice(token, invoiceDetails);
    invoiceUuid = draft.uuid;

    const found = await (client as unknown as { findInvoice: (t: unknown, d: { uuid: string }) => Promise<Record<string, unknown> | undefined> }).findInvoice(token, draft);
    invoiceNumber = extractDocumentNumber(found);

    if (config.autoSign && found) {
      try {
        await (client as unknown as { signDraftInvoice: (t: unknown, f: unknown) => Promise<void> }).signDraftInvoice(token, found);
        signed = true;
        const afterSign = await (client as unknown as { findInvoice: (t: unknown, d: { uuid: string }) => Promise<Record<string, unknown> | undefined> }).findInvoice(token, draft);
        invoiceNumber = extractDocumentNumber(afterSign) ?? invoiceNumber;
      } catch {
        // İmzalanmadı ama taslak oluşturuldu — devam et
      }
    }

    downloadUrl = (client as unknown as { getDownloadURL: (t: unknown, uuid: string, opts: { signed: boolean }) => string }).getDownloadURL(token, draft.uuid, { signed });
    await (client as unknown as { logout: (t: unknown) => Promise<void> }).logout(token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `GİB bağlantı hatası: ${msg}` };
  }

  // Persist records
  const site = await prisma.storeSite.findUnique({ where: { id: siteId }, select: { settingsJson: true } });
  const taxConfig = getTaxConfig(parseSiteSettings(site?.settingsJson ?? null));

  // FinanceInvoice (onay kaydı)
  const fi = await prisma.financeInvoice.create({
    data: {
      siteId,
      source: "manual",
      direction: "outgoing",
      status: signed ? "signed" : "draft",
      issueDate,
      counterpartyType: "external_manual",
      title: invoiceNumber ?? `e-Arşiv ${invoiceUuid}`,
      linesJson: JSON.stringify(input.lines),
      subtotalMinor: Math.round(grandTotal * 100),
      vatMinor: Math.round(totalVAT * 100),
      totalMinor: Math.round(grandTotalInclVAT * 100),
      gibExternalId: invoiceUuid,
      gibInvoiceNumber: invoiceNumber ?? null,
      gibUuid: invoiceUuid,
      description: input.description?.trim() ?? input.recipientName,
      createdByStaffUserId: actorUserId ?? null,
    },
  });

  // Group lines by KDV rate → InvoiceEntry per rate
  const rateGroups = new Map<number, { netMinor: number; kdvMinor: number }>();
  for (const l of input.lines) {
    const rate = l.vatRate <= 2 ? 1 : l.vatRate <= 15 ? 10 : 20;
    const g = rateGroups.get(rate) ?? { netMinor: 0, kdvMinor: 0 };
    rateGroups.set(rate, {
      netMinor: g.netMinor + Math.round(l.unitPriceTl * l.qty * 100),
      kdvMinor: g.kdvMinor + Math.round(l.unitPriceTl * l.qty * l.vatRate),
    });
  }

  let entryId: string | undefined;
  for (const [rate, amounts] of rateGroups) {
    const entry = await prisma.invoiceEntry.create({
      data: {
        siteId,
        direction: "outgoing",
        invoiceDate: issueDate,
        invoiceNo: invoiceNumber ?? `gib:${invoiceUuid}:r${rate}`,
        counterparty: input.recipientTaxId
          ? `${input.recipientName} (${input.recipientTaxId})`
          : input.recipientName,
        netMinor: amounts.netMinor,
        kdvRate: rate as 1 | 10 | 20,
        kdvMinor: amounts.kdvMinor,
        description: input.description?.trim() ?? input.lines.map((l) => l.description).join(", "),
      },
    });
    if (!entryId) entryId = entry.id;
  }

  // Sync KDV + geçici obligations
  await syncKdvFromInvoiceDate(siteId, issueDate);
  await syncGeciciObligations(siteId, issueDate.getUTCFullYear(), taxConfig.incomeBrackets);

  return {
    ok: true,
    message: signed
      ? `e-Arşiv faturası kesildi ve imzalandı (${invoiceNumber ?? invoiceUuid})`
      : `e-Arşiv taslak faturası oluşturuldu (${invoiceUuid}). GİB portalından imzalayın.`,
    invoiceNumber,
    invoiceUuid,
    downloadUrl,
    signed,
    entryId,
  };
}
