import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { parseInvoiceLinesJson, type NormalizedInvoiceLine } from "@/lib/finance/invoices";
import { normalizeStockDescription, parseInvoiceUnit } from "@/lib/stock/units";
import { convertInvoiceLineToBase, recordStockMovement, StockError } from "@/lib/stock/movements";

type Db = PrismaClient | Prisma.TransactionClient;

export type InvoiceLineWithUnit = NormalizedInvoiceLine & { unit?: string };

export function parseInvoiceLinesWithUnit(raw: string | null | undefined): InvoiceLineWithUnit[] {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .map((r) => ({
        description: String(r.description ?? "").trim(),
        qty: Number(r.qty ?? 0),
        unitPriceMinor: Number(r.unitPriceMinor ?? 0),
        lineSubtotalMinor: Number(r.lineSubtotalMinor ?? 0),
        vatRate: Number(r.vatRate ?? 0),
        vatMinor: Number(r.vatMinor ?? 0),
        totalMinor: Number(r.totalMinor ?? 0),
        unit: r.unit != null ? String(r.unit) : undefined,
      }))
      .filter((l) => l.description && l.qty > 0);
  } catch {
    return parseInvoiceLinesJson(raw).map((l) => ({ ...l }));
  }
}

async function resolveMapping(
  tx: Db,
  siteId: string,
  description: string,
  invoiceUnit: string,
  stockItemId?: string | null,
) {
  const descriptionNorm = normalizeStockDescription(description);
  if (stockItemId) {
    const item = await tx.stockItem.findFirst({ where: { id: stockItemId, siteId } });
    if (!item) throw new StockError("Stok kartı bulunamadı.");
    await tx.financeInvoiceLineStockMapping.upsert({
      where: { siteId_descriptionNorm: { siteId, descriptionNorm } },
      create: { siteId, descriptionNorm, stockItemId: item.id, invoiceUnit },
      update: { stockItemId: item.id, invoiceUnit },
    });
    return item;
  }

  const mapping = await tx.financeInvoiceLineStockMapping.findUnique({
    where: { siteId_descriptionNorm: { siteId, descriptionNorm } },
    include: { stockItem: true },
  });
  if (!mapping?.stockItem?.active) {
    throw new StockError(`Stok eşlemesi yok: "${description}" — önce fatura satırını stok kartına bağlayın.`);
  }
  return mapping.stockItem;
}

/** Alış / satış faturası onayında stok hareketi */
export async function postFinanceInvoiceStock(
  tx: Db,
  params: {
    siteId: string;
    invoiceId: string;
    direction: string;
    linesJson: string;
    issueDate: Date;
    orderId?: string | null;
    staffUserId?: string | null;
    lineMappings?: Array<{ lineIndex: number; stockItemId: string; invoiceUnit?: string }>;
  },
) {
  const invoice = await tx.financeInvoice.findFirst({
    where: { id: params.invoiceId, siteId: params.siteId },
    select: { stockPostedAt: true, orderId: true },
  });
  if (!invoice) throw new StockError("Fatura bulunamadı.");
  if (invoice.stockPostedAt) return { skipped: true, reason: "already_posted" as const };

  // Siparişe bağlı satış faturası — stok zaten siparişte düşüldü
  if (params.direction === "outgoing" && (params.orderId || invoice.orderId)) {
    await tx.financeInvoice.update({
      where: { id: params.invoiceId },
      data: { stockPostedAt: new Date() },
    });
    return { skipped: true, reason: "order_linked" as const };
  }

  const lines = parseInvoiceLinesWithUnit(params.linesJson);
  const mappingByIndex = new Map(
    (params.lineMappings ?? []).map((m) => [m.lineIndex, m]),
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const override = mappingByIndex.get(i);
    const invoiceUnit = parseInvoiceUnit(override?.invoiceUnit ?? line.unit);
    const item = await resolveMapping(
      tx,
      params.siteId,
      line.description,
      invoiceUnit,
      override?.stockItemId,
    );

    const qtyBase = await convertInvoiceLineToBase(line.qty, invoiceUnit, item.unit as "kg" | "adet");
    const signed =
      params.direction === "incoming" ? qtyBase : -qtyBase;
    const type = params.direction === "incoming" ? "purchase" : "sale";

    await recordStockMovement(tx, {
      siteId: params.siteId,
      stockItemId: item.id,
      type,
      qtyBase: signed,
      refType: "finance_invoice",
      refId: params.invoiceId,
      lineKey: String(i),
      occurredAt: params.issueDate,
      staffUserId: params.staffUserId,
    });
  }

  await tx.financeInvoice.update({
    where: { id: params.invoiceId },
    data: { stockPostedAt: new Date() },
  });

  return { skipped: false, linesPosted: lines.length };
}
