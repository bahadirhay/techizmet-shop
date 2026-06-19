import "server-only";

import { orderInvoicePendingWhere } from "@/lib/admin/order-invoice-workflow";
import { loadCariTotals, loadReceivablesPayables } from "@/lib/finance/cari-ledger";
import { prisma } from "@/lib/prisma";

export type FinanceAlertSeverity = "critical" | "warning" | "info";

export type FinanceAlert = {
  id: string;
  severity: FinanceAlertSeverity;
  title: string;
  description: string;
  href: string;
  count?: number;
  amountMinor?: number;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export async function loadFinanceAlerts(siteId: string): Promise<FinanceAlert[]> {
  const today = startOfToday();
  const in7 = addDays(today, 7);

  const [
    cariTotals,
    { receivables, payables },
    overdueInvoices,
    dueSoonInvoices,
    pendingApprovalInvoices,
    unfactoredOrders,
    paidUnfactoredOrders,
    gibErrorOrders,
  ] = await Promise.all([
    loadCariTotals(siteId),
    loadReceivablesPayables(siteId),
    prisma.financeInvoice.findMany({
      where: {
        siteId,
        status: { notIn: ["rejected", "cancelled", "posted"] },
        dueDate: { lt: today },
        direction: "outgoing",
      },
      select: { id: true, totalMinor: true, title: true, dueDate: true },
      take: 50,
    }),
    prisma.financeInvoice.findMany({
      where: {
        siteId,
        status: { in: ["draft", "pending_approval", "approved"] },
        dueDate: { gte: today, lte: in7 },
      },
      select: { id: true, totalMinor: true, title: true, dueDate: true, direction: true },
      take: 50,
    }),
    prisma.financeInvoice.count({
      where: { siteId, status: "pending_approval" },
    }),
    prisma.storeOrder.findMany({
      where: { siteId, ...orderInvoicePendingWhere() },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        orderNumber: true,
        totalMinor: true,
        status: true,
        paymentStatus: true,
        updatedAt: true,
      },
    }),
    prisma.storeOrder.findMany({
      where: {
        siteId,
        paymentStatus: "paid",
        ...orderInvoicePendingWhere(),
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        orderNumber: true,
        totalMinor: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.storeOrder.findMany({
      where: {
        siteId,
        invoiceStatus: "error",
        paymentStatus: "paid",
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, orderNumber: true, totalMinor: true },
    }),
  ]);

  const alerts: FinanceAlert[] = [];

  const overdueReceivable = receivables.filter((r) => r.daysOverdue > 0);
  const overduePayable = payables.filter((r) => r.daysOverdue > 0);

  if (overdueReceivable.length > 0) {
    const amount = overdueReceivable.reduce((s, r) => s + r.openMinor, 0);
    alerts.push({
      id: "overdue-receivable",
      severity: "critical",
      title: "Vadesi geçmiş alacak",
      description: `${overdueReceivable.length} açık fatura — tahsilat gecikmiş.`,
      href: "/admin/finance/cari?tab=alacak",
      count: overdueReceivable.length,
      amountMinor: amount,
    });
  }

  if (overduePayable.length > 0) {
    const amount = overduePayable.reduce((s, r) => s + r.openMinor, 0);
    alerts.push({
      id: "overdue-payable",
      severity: "critical",
      title: "Vadesi geçmiş borç",
      description: `${overduePayable.length} tedarikçi / gider faturası ödenmemiş.`,
      href: "/admin/finance/cari?tab=borc",
      count: overduePayable.length,
      amountMinor: amount,
    });
  }

  if (dueSoonInvoices.length > 0) {
    alerts.push({
      id: "due-soon",
      severity: "warning",
      title: "Vadesi yaklaşan faturalar",
      description: `7 gün içinde vadesi dolacak ${dueSoonInvoices.length} fatura.`,
      href: "/admin/finance/invoices",
      count: dueSoonInvoices.length,
    });
  }

  if (pendingApprovalInvoices > 0) {
    alerts.push({
      id: "pending-approval",
      severity: "warning",
      title: "Onay bekleyen faturalar",
      description: `${pendingApprovalInvoices} fatura onay kuyruğunda.`,
      href: "/admin/finance/invoices",
      count: pendingApprovalInvoices,
    });
  }

  if (paidUnfactoredOrders.length > 0) {
    const amount = paidUnfactoredOrders.reduce((s, o) => s + o.totalMinor, 0);
    alerts.push({
      id: "unfactored-paid",
      severity: "critical",
      title: "Faturasız ödenmiş sipariş",
      description: `${paidUnfactoredOrders.length} sipariş ödendi ve kargolandı; e-Arşiv kesilmedi.`,
      href: "/admin/orders?invoice=pending",
      count: paidUnfactoredOrders.length,
      amountMinor: amount,
    });
  } else if (unfactoredOrders.length > 0) {
    alerts.push({
      id: "unfactored-shipped",
      severity: "warning",
      title: "Faturasız kargolanmış sipariş",
      description: `${unfactoredOrders.length} sipariş kargolandı; fatura bekleniyor.`,
      href: "/admin/orders?invoice=pending",
      count: unfactoredOrders.length,
    });
  }

  if (gibErrorOrders.length > 0) {
    alerts.push({
      id: "gib-error",
      severity: "critical",
      title: "GİB fatura hatası",
      description: `${gibErrorOrders.length} siparişte e-Arşiv kesimi başarısız.`,
      href: "/admin/orders",
      count: gibErrorOrders.length,
    });
  }

  if (overdueInvoices.length > 0) {
    alerts.push({
      id: "overdue-draft-invoices",
      severity: "info",
      title: "Vadesi geçmiş taslak faturalar",
      description: `${overdueInvoices.length} giden fatura henüz kesilmemiş / onaylanmamış ama vadesi geçti.`,
      href: "/admin/finance/invoices",
      count: overdueInvoices.length,
    });
  }

  if (cariTotals.totalReceivableMinor > 0 || cariTotals.totalPayableMinor > 0) {
    alerts.push({
      id: "cari-summary",
      severity: "info",
      title: "Cari özet",
      description: `Alacak ${(cariTotals.totalReceivableMinor / 100).toFixed(2)} ₺ · Borç ${(cariTotals.totalPayableMinor / 100).toFixed(2)} ₺`,
      href: "/admin/finance/cari",
      amountMinor: cariTotals.netMinor,
    });
  }

  const severityOrder: Record<FinanceAlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
