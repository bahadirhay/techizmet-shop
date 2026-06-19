import "server-only";

import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import {
  invoiceLinesToJson,
  type NormalizedInvoiceLine,
} from "@/lib/finance/invoices";
import { resolvePostingByTemplate } from "@/lib/finance/posting-template";
import { prisma } from "@/lib/prisma";

const DEFAULT_VAT_RATE = 20;

function lineFromMinorInclVat(
  description: string,
  qty: number,
  lineMinorInclVat: number,
  vatRate: number,
): NormalizedInvoiceLine | null {
  if (lineMinorInclVat <= 0 || qty <= 0) return null;
  const totalMinor = lineMinorInclVat;
  const lineSubtotalMinor = Math.round(totalMinor / (1 + vatRate / 100));
  const vatMinor = totalMinor - lineSubtotalMinor;
  const unitPriceMinor = Math.max(1, Math.round(lineSubtotalMinor / qty));
  return {
    description: description.slice(0, 500),
    qty,
    unitPriceMinor,
    lineSubtotalMinor,
    vatRate,
    vatMinor,
    totalMinor,
  };
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function buildFinanceInvoiceLinesFromOrder(order: {
  shippingMinor: number;
  discountMinor: number;
  lines: {
    title: string;
    qty: number;
    lineMinor: number;
    discountMinor: number;
    vatRate: number;
  }[];
}): NormalizedInvoiceLine[] {
  const lines: NormalizedInvoiceLine[] = [];

  for (const l of order.lines) {
    const netMinor = Math.max(0, l.lineMinor - (l.discountMinor ?? 0));
    const row = lineFromMinorInclVat(
      l.title,
      l.qty,
      netMinor,
      l.vatRate > 0 ? l.vatRate : DEFAULT_VAT_RATE,
    );
    if (row) lines.push(row);
  }

  if (order.shippingMinor > 0) {
    const ship = lineFromMinorInclVat("Kargo", 1, order.shippingMinor, DEFAULT_VAT_RATE);
    if (ship) lines.push(ship);
  }

  return lines;
}

/**
 * Açık hesap siparişi için ön muhasebe satış faturası (alacak) oluşturur.
 * Idempotent — aynı sipariş için tek kayıt.
 */
export async function createOpenAccountFinanceInvoice(
  siteId: string,
  orderId: string,
): Promise<{ invoiceId: string; created: boolean }> {
  const existing = await prisma.financeInvoice.findFirst({
    where: { siteId, orderId },
    select: { id: true },
  });
  if (existing) return { invoiceId: existing.id, created: false };

  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { lines: true },
  });
  if (!order) throw new Error("Sipariş bulunamadı");
  if (order.paymentMethod !== "open_account") {
    throw new Error("Yalnızca açık hesap siparişleri için fatura oluşturulur");
  }
  if (!order.customerId) throw new Error("Müşteri kaydı gerekli");

  const counterparty = await prisma.financeCounterparty.findFirst({
    where: { siteId, customerId: order.customerId, active: true },
    select: {
      id: true,
      paymentTermDays: true,
    },
  });

  const customer = await prisma.storeCustomer.findFirst({
    where: { id: order.customerId, siteId },
    include: { customerGroup: true },
  });

  const paymentTermDays =
    counterparty?.paymentTermDays ??
    customer?.customerGroup?.defaultPaymentTermDays ??
    30;

  const invoiceLines = buildFinanceInvoiceLinesFromOrder({
    shippingMinor: order.shippingMinor,
    discountMinor: order.discountMinor,
    lines: order.lines.map((l) => ({
      title: l.title,
      qty: l.qty,
      lineMinor: l.lineMinor,
      discountMinor: l.discountMinor,
      vatRate: l.vatRate ?? DEFAULT_VAT_RATE,
    })),
  });

  if (!invoiceLines.length) throw new Error("Fatura satırı üretilemedi");

  const subtotalMinor = invoiceLines.reduce((s, l) => s + l.lineSubtotalMinor, 0);
  const vatMinor = invoiceLines.reduce((s, l) => s + l.vatMinor, 0);
  const totalMinor = invoiceLines.reduce((s, l) => s + l.totalMinor, 0);

  await ensureFinanceDefaults(siteId);

  const title = `Sipariş ${order.orderNumber} — açık hesap`;
  const description = `Otomatik alacak faturası · ${order.customerName ?? order.customerEmail ?? ""}`;

  const category = await prisma.financeCategory.findFirst({
    where: { siteId, kind: "income", name: "Web satış" },
    select: { id: true },
  });

  const calcPreview = {
    source: "order_open_account",
    direction: "outgoing",
    title,
    description,
    linesJson: invoiceLinesToJson(invoiceLines),
    categoryId: category?.id ?? null,
    accountId: null,
  };
  const mapped = await resolvePostingByTemplate(siteId, calcPreview);

  const issueDate = order.createdAt;
  const dueDate = paymentTermDays > 0 ? addDays(issueDate, paymentTermDays) : null;

  const invoice = await prisma.financeInvoice.create({
    data: {
      siteId,
      source: "order_open_account",
      direction: "outgoing",
      status: "approved",
      issueDate,
      dueDate,
      counterpartyType: "site_member",
      customerId: order.customerId,
      counterpartyId: counterparty?.id ?? null,
      orderId: order.id,
      title,
      description,
      linesJson: invoiceLinesToJson(invoiceLines),
      subtotalMinor,
      vatMinor,
      totalMinor,
      categoryId: mapped.categoryId ?? category?.id ?? null,
      accountId: mapped.accountId,
      approvedAt: new Date(),
    },
  });

  await prisma.financeInvoiceApprovalLog.create({
    data: {
      siteId,
      invoiceId: invoice.id,
      action: "auto_open_account_order",
      note: `Açık hesap siparişi ${order.orderNumber} — vade ${paymentTermDays} gün`,
    },
  });

  return { invoiceId: invoice.id, created: true };
}
