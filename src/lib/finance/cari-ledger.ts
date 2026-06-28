import "server-only";

import { prisma } from "@/lib/prisma";

export type CariOpenItem = {
  invoiceId: string;
  direction: "outgoing" | "incoming";
  title: string | null;
  issueDate: Date;
  dueDate: Date | null;
  totalMinor: number;
  paidMinor: number;
  openMinor: number;
  daysOverdue: number;
  agingBucket: "current" | "1-30" | "31-60" | "60+";
  status: string;
};

export type CariLedgerRow = {
  id: string;
  date: Date;
  kind: "invoice" | "payment" | "transaction";
  label: string;
  debitMinor: number;
  creditMinor: number;
  refHref: string | null;
};

export type CariCounterpartySummary = {
  id: string;
  title: string;
  type: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  customerId: string | null;
  receivableMinor: number;
  payableMinor: number;
  netMinor: number;
  openInvoiceCount: number;
  paymentTermDays: number | null;
  creditLimitMinor: number | null;
  openAccountEnabled: boolean;
  creditHold: boolean;
  tags: string | null;
  availableCreditMinor: number | null;
};

export type CariCounterpartyDetail = CariCounterpartySummary & {
  ledger: CariLedgerRow[];
  openItems: CariOpenItem[];
  aging: { current: number; d1_30: number; d31_60: number; d60plus: number };
};

const CLOSED_INVOICE_STATUSES = new Set(["rejected", "cancelled"]);

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLocaleLowerCase("tr-TR");
}

function agingBucket(daysOverdue: number): CariOpenItem["agingBucket"] {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  return "60+";
}

function daysOverdue(dueDate: Date | null, issueDate: Date): number {
  const ref = dueDate ?? issueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / 86400000);
}

function matchesCounterparty(
  cp: { id: string; title: string; taxId: string | null; customerId: string | null },
  inv: { counterpartyId: string | null; customerId: string | null },
): boolean {
  if (inv.counterpartyId === cp.id) return true;
  if (cp.customerId && inv.customerId === cp.customerId) return true;
  return false;
}

function txMatchesCounterparty(
  cp: { id: string; title: string; taxId: string | null; customerId: string | null },
  customerNames: string[],
  tx: { counterpartyName: string | null; counterpartyTaxId: string | null; financeInvoiceId: string | null },
  invoiceCounterpartyIds: Map<string, string | null>,
  invoiceCustomerIds: Map<string, string | null>,
): boolean {
  if (tx.financeInvoiceId) {
    const icp = invoiceCounterpartyIds.get(tx.financeInvoiceId);
    const icu = invoiceCustomerIds.get(tx.financeInvoiceId);
    if (icp === cp.id || (cp.customerId && icu === cp.customerId)) return true;
  }
  if (cp.taxId && tx.counterpartyTaxId && norm(tx.counterpartyTaxId) === norm(cp.taxId)) return true;
  const txName = norm(tx.counterpartyName);
  if (!txName) return false;
  if (txName === norm(cp.title)) return true;
  return customerNames.some((n) => norm(n) === txName);
}

async function loadCariContext(siteId: string) {
  const [counterparties, invoices, payments, customerRows] = await Promise.all([
    prisma.financeCounterparty.findMany({
      where: { siteId, active: true },
      orderBy: { title: "asc" },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.financeInvoice.findMany({
      where: { siteId, status: { notIn: ["rejected", "cancelled"] } },
      select: {
        id: true,
        counterpartyId: true,
        customerId: true,
        direction: true,
        status: true,
        title: true,
        issueDate: true,
        dueDate: true,
        totalMinor: true,
        gibInvoiceNumber: true,
      },
    }),
    prisma.financeTransaction.findMany({
      where: {
        siteId,
        kind: { in: ["payment_in", "payment_out"] },
      },
      select: {
        id: true,
        txDate: true,
        kind: true,
        amountMinor: true,
        description: true,
        financeInvoiceId: true,
        counterpartyName: true,
        counterpartyTaxId: true,
      },
    }),
    prisma.storeCustomer.findMany({
      where: { siteId },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  const customerNameById = new Map<string, string[]>();
  for (const c of customerRows) {
    const names = [
      [c.firstName, c.lastName].filter(Boolean).join(" "),
      c.email ?? "",
    ].filter(Boolean);
    customerNameById.set(c.id, names);
  }

  const invoiceCounterpartyIds = new Map(invoices.map((i) => [i.id, i.counterpartyId]));
  const invoiceCustomerIds = new Map(invoices.map((i) => [i.id, i.customerId]));

  const paidByInvoice = new Map<string, number>();
  for (const p of payments) {
    if (!p.financeInvoiceId) continue;
    const prev = paidByInvoice.get(p.financeInvoiceId) ?? 0;
    paidByInvoice.set(p.financeInvoiceId, prev + p.amountMinor);
  }

  return {
    counterparties,
    invoices,
    payments,
    customerNameById,
    invoiceCounterpartyIds,
    invoiceCustomerIds,
    paidByInvoice,
  };
}

function buildOpenItems(
  cp: { id: string; title: string; taxId: string | null; customerId: string | null },
  invoices: Awaited<ReturnType<typeof loadCariContext>>["invoices"],
  paidByInvoice: Map<string, number>,
): CariOpenItem[] {
  const items: CariOpenItem[] = [];
  for (const inv of invoices) {
    if (!matchesCounterparty(cp, inv)) continue;
    if (CLOSED_INVOICE_STATUSES.has(inv.status)) continue;
    const paidMinor = paidByInvoice.get(inv.id) ?? 0;
    const openMinor = Math.max(0, inv.totalMinor - paidMinor);
    if (openMinor <= 0) continue;
    const overdue = daysOverdue(inv.dueDate, inv.issueDate);
    items.push({
      invoiceId: inv.id,
      direction: inv.direction === "incoming" ? "incoming" : "outgoing",
      title: inv.title,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      totalMinor: inv.totalMinor,
      paidMinor,
      openMinor,
      daysOverdue: overdue,
      agingBucket: agingBucket(overdue),
      status: inv.status,
    });
  }
  return items.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

function summarizeOpen(openItems: CariOpenItem[]) {
  let receivableMinor = 0;
  let payableMinor = 0;
  const aging = { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 };
  for (const item of openItems) {
    if (item.direction === "outgoing") receivableMinor += item.openMinor;
    else payableMinor += item.openMinor;
    if (item.agingBucket === "current") aging.current += item.openMinor;
    else if (item.agingBucket === "1-30") aging.d1_30 += item.openMinor;
    else if (item.agingBucket === "31-60") aging.d31_60 += item.openMinor;
    else aging.d60plus += item.openMinor;
  }
  return { receivableMinor, payableMinor, aging };
}

function buildLedger(
  cp: { id: string; title: string; taxId: string | null; customerId: string | null },
  ctx: Awaited<ReturnType<typeof loadCariContext>>,
): CariLedgerRow[] {
  const customerNames = cp.customerId ? (ctx.customerNameById.get(cp.customerId) ?? []) : [];
  const rows: CariLedgerRow[] = [];

  for (const inv of ctx.invoices) {
    if (!matchesCounterparty(cp, inv)) continue;
    const isOut = inv.direction !== "incoming";
    rows.push({
      id: `inv-${inv.id}`,
      date: inv.issueDate,
      kind: "invoice",
      label: inv.title?.trim() || (isOut ? "Satış faturası" : "Alış faturası"),
      debitMinor: isOut ? inv.totalMinor : 0,
      creditMinor: isOut ? 0 : inv.totalMinor,
      refHref: `/admin/finance/invoices`,
    });
  }

  for (const p of ctx.payments) {
    if (
      !txMatchesCounterparty(
        cp,
        customerNames,
        p,
        ctx.invoiceCounterpartyIds,
        ctx.invoiceCustomerIds,
      )
    ) {
      continue;
    }
    const isIn = p.kind === "payment_in";
    rows.push({
      id: `pay-${p.id}`,
      date: p.txDate,
      kind: "payment",
      label: p.description || (isIn ? "Tahsilat" : "Ödeme"),
      debitMinor: isIn ? 0 : p.amountMinor,
      creditMinor: isIn ? p.amountMinor : 0,
      refHref: `/admin/finance/transactions`,
    });
  }

  return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function loadCariSummaryList(siteId: string): Promise<CariCounterpartySummary[]> {
  const ctx = await loadCariContext(siteId);
  return ctx.counterparties.map((cp) => {
    const openItems = buildOpenItems(cp, ctx.invoices, ctx.paidByInvoice);
    const { receivableMinor, payableMinor } = summarizeOpen(openItems);
    return {
      id: cp.id,
      title: cp.title,
      type: cp.type,
      taxId: cp.taxId,
      email: cp.email,
      phone: cp.phone,
      customerId: cp.customerId,
      receivableMinor,
      payableMinor,
      netMinor: receivableMinor - payableMinor,
      openInvoiceCount: openItems.length,
      paymentTermDays: cp.paymentTermDays,
      creditLimitMinor: cp.creditLimitMinor,
      openAccountEnabled: cp.openAccountEnabled,
      creditHold: cp.creditHold,
      tags: cp.tags,
      availableCreditMinor:
        cp.creditLimitMinor != null
          ? Math.max(0, cp.creditLimitMinor - receivableMinor)
          : null,
    };
  });
}

export async function loadCariCounterpartyDetail(
  siteId: string,
  counterpartyId: string,
): Promise<CariCounterpartyDetail | null> {
  const ctx = await loadCariContext(siteId);
  const cp = ctx.counterparties.find((c) => c.id === counterpartyId);
  if (!cp) return null;

  const openItems = buildOpenItems(cp, ctx.invoices, ctx.paidByInvoice);
  const { receivableMinor, payableMinor, aging } = summarizeOpen(openItems);
  const ledger = buildLedger(cp, ctx);

  return {
    id: cp.id,
    title: cp.title,
    type: cp.type,
    taxId: cp.taxId,
    email: cp.email,
    phone: cp.phone,
    customerId: cp.customerId,
    receivableMinor,
    payableMinor,
    netMinor: receivableMinor - payableMinor,
    openInvoiceCount: openItems.length,
    paymentTermDays: cp.paymentTermDays,
    creditLimitMinor: cp.creditLimitMinor,
    openAccountEnabled: cp.openAccountEnabled,
    creditHold: cp.creditHold,
    tags: cp.tags,
    availableCreditMinor:
      cp.creditLimitMinor != null
        ? Math.max(0, cp.creditLimitMinor - receivableMinor)
        : null,
    ledger,
    openItems,
    aging,
  };
}

export type ReceivablePayableRow = CariOpenItem & {
  counterpartyId: string | null;
  counterpartyTitle: string;
  customerId: string | null;
};

export async function loadReceivablesPayables(siteId: string): Promise<{
  receivables: ReceivablePayableRow[];
  payables: ReceivablePayableRow[];
  totalReceivableMinor: number;
  totalPayableMinor: number;
}> {
  const ctx = await loadCariContext(siteId);
  const receivables: ReceivablePayableRow[] = [];
  const payables: ReceivablePayableRow[] = [];

  for (const cp of ctx.counterparties) {
    const openItems = buildOpenItems(cp, ctx.invoices, ctx.paidByInvoice);
    for (const item of openItems) {
      const row: ReceivablePayableRow = {
        ...item,
        counterpartyId: cp.id,
        counterpartyTitle: cp.title,
        customerId: cp.customerId,
      };
      if (item.direction === "outgoing") receivables.push(row);
      else payables.push(row);
    }
  }

  receivables.sort((a, b) => b.daysOverdue - a.daysOverdue);
  payables.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    receivables,
    payables,
    totalReceivableMinor: receivables.reduce((s, r) => s + r.openMinor, 0),
    totalPayableMinor: payables.reduce((s, r) => s + r.openMinor, 0),
  };
}

// ── Tüm cari listesi (counterparty + carisi olmayan üyeler) ─────────────────

export type CustomerNoCariRow = {
  kind: "customer_no_cari";
  customerId: string;
  title: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  orderCount: number;
  totalSpentMinor: number;
};

export type UnifiedCariRow =
  | (CariCounterpartySummary & { kind: "counterparty" })
  | CustomerNoCariRow;

export async function loadAllCariRows(siteId: string): Promise<UnifiedCariRow[]> {
  const [summaries, customersWithOrders] = await Promise.all([
    loadCariSummaryList(siteId),
    prisma.storeCustomer.findMany({
      where: { siteId, orders: { some: {} } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        phone: true,
        taxId: true,
        financeCounterparties: {
          where: { active: true },
          select: { id: true },
          take: 1,
        },
        _count: { select: { orders: true } },
        orders: {
          select: { totalMinor: true },
          take: 100,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  // Hangi müşterilerin zaten cari kaydı var?
  const counterpartyCustomerIds = new Set(summaries.map((s) => s.customerId).filter(Boolean));

  const rows: UnifiedCariRow[] = summaries.map((s) => ({ ...s, kind: "counterparty" as const }));

  for (const c of customersWithOrders) {
    if (c.financeCounterparties.length > 0 || counterpartyCustomerIds.has(c.id)) continue;
    const name =
      c.companyName?.trim() ||
      [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
      c.email ||
      "Üye";
    rows.push({
      kind: "customer_no_cari",
      customerId: c.id,
      title: name,
      email: c.email,
      phone: c.phone,
      taxId: c.taxId,
      orderCount: c._count.orders,
      totalSpentMinor: c.orders.reduce((s, o) => s + o.totalMinor, 0),
    });
  }

  // Counterparty'ler önce (bakiyeli en başta), sonra üyeler
  rows.sort((a, b) => {
    if (a.kind === "counterparty" && b.kind === "counterparty") {
      return (b.receivableMinor + b.payableMinor) - (a.receivableMinor + a.payableMinor);
    }
    if (a.kind === "counterparty") return -1;
    if (b.kind === "counterparty") return 1;
    return b.orderCount - a.orderCount;
  });

  return rows;
}

export async function loadCariTotals(siteId: string): Promise<{
  totalReceivableMinor: number;
  totalPayableMinor: number;
  netMinor: number;
}> {
  const { totalReceivableMinor, totalPayableMinor } = await loadReceivablesPayables(siteId);
  return {
    totalReceivableMinor,
    totalPayableMinor,
    netMinor: totalReceivableMinor - totalPayableMinor,
  };
}
