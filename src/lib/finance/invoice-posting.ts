import "server-only";

import type { PrismaClient } from "@prisma/client";
import { financeKindFromDirection } from "@/lib/finance/invoices";
import { resolvePostingByTemplate } from "@/lib/finance/posting-template";

export async function postInvoiceToFinance(
  prisma: PrismaClient,
  params: { siteId: string; invoiceId: string; actorUserId?: string | null; note?: string | null },
) {
  const invoice = await prisma.financeInvoice.findFirst({
    where: { id: params.invoiceId, siteId: params.siteId },
    include: { customer: true, counterparty: true },
  });
  if (!invoice) throw new Error("Fatura bulunamadı.");
  if (invoice.status === "posted" && invoice.postedTransactionId) {
    return { alreadyPosted: true, transactionId: invoice.postedTransactionId };
  }

  const mapped = await resolvePostingByTemplate(params.siteId, invoice);
  if (!mapped.categoryId || !mapped.accountId) {
    throw new Error("Muhasebe kategorisi ve hesabı zorunlu.");
  }

  const now = new Date();
  const tx = await prisma.$transaction(async (trx) => {
    const posted = await trx.financeTransaction.create({
      data: {
        siteId: params.siteId,
        txDate: invoice.issueDate,
        kind: financeKindFromDirection(invoice.direction),
        amountMinor: invoice.totalMinor,
        categoryId: mapped.categoryId,
        accountId: mapped.accountId,
        description: invoice.title?.trim() || `Fatura ${invoice.direction === "incoming" ? "alış" : "satış"}`,
        invoiceDirection: invoice.direction === "incoming" ? "received" : "issued",
        invoiceNumber: invoice.gibInvoiceNumber || null,
        counterpartyName:
          invoice.customer
            ? [invoice.customer.firstName, invoice.customer.lastName].filter(Boolean).join(" ") ||
              invoice.customer.email ||
              null
            : invoice.counterparty?.title || null,
        counterpartyTaxId: invoice.counterparty?.taxId || invoice.gibExternalId || null,
        vatMinor: invoice.vatMinor,
        notes: invoice.description || null,
        financeInvoiceId: invoice.id,
      },
    });

    const updated = await trx.financeInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "posted",
        categoryId: mapped.categoryId,
        accountId: mapped.accountId,
        postedTransactionId: posted.id,
        approvedByStaffUserId: params.actorUserId || invoice.approvedByStaffUserId || null,
        approvedAt: invoice.approvedAt || now,
      },
    });
    await trx.financeInvoiceApprovalLog.create({
      data: {
        siteId: params.siteId,
        invoiceId: invoice.id,
        action: "approved_and_posted",
        actorUserId: params.actorUserId || null,
        note: params.note?.trim() || "Onaylandı ve muhasebeye işlendi.",
      },
    });
    return { posted, updated };
  });
  return { alreadyPosted: false, ...tx };
}
