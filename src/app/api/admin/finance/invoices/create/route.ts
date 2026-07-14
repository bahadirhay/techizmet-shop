import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";
import {
  normalizeInvoiceLines,
  invoiceLinesToJson,
  type DraftInvoiceLineInput,
} from "@/lib/finance/invoices";

/**
 * Manuel fatura oluşturur (FinanceInvoice → onay kuyruğu).
 * FinanceInvoicesManager formundan gelir: satırlardan tutar hesaplanır,
 * gelen (gider) / giden (gelir) faturası olarak kaydedilir.
 * NOT: `/api/admin/finance/invoices` POST'u InvoiceEntry (KDV) oluşturur ve
 * KdvTracker tarafından kullanılır; bu ayrı rota FinanceInvoice içindir.
 */
export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    direction?: string;
    customerId?: string;
    counterpartyId?: string;
    categoryId?: string;
    accountId?: string;
    title?: string;
    description?: string;
    issueDate?: string;
    sendToApproval?: boolean;
    lines?: DraftInvoiceLineInput[];
  };

  const direction = body.direction === "incoming" ? "incoming" : "outgoing";
  const linesInput = Array.isArray(body.lines) ? body.lines : [];
  const calc = normalizeInvoiceLines(linesInput);
  if (calc.lines.length === 0 || calc.totalMinor <= 0) {
    return NextResponse.json(
      { error: "En az bir geçerli satır girin (açıklama, miktar ve birim fiyat zorunlu)." },
      { status: 400 },
    );
  }

  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
  if (Number.isNaN(issueDate.getTime())) {
    return NextResponse.json({ error: "Geçersiz tarih." }, { status: 400 });
  }

  const customerId = body.customerId?.trim() || null;
  const counterpartyId = customerId ? null : body.counterpartyId?.trim() || null;
  const counterpartyType = customerId
    ? "site_member"
    : counterpartyId
      ? "counterparty"
      : "external_manual";

  const status = body.sendToApproval === false ? "draft" : "pending_approval";

  const created = await prisma.financeInvoice.create({
    data: {
      siteId: auth.siteId,
      source: "manual",
      direction,
      status,
      issueDate,
      counterpartyType,
      customerId,
      counterpartyId,
      categoryId: body.categoryId?.trim() || null,
      accountId: body.accountId?.trim() || null,
      title: body.title?.trim() || null,
      description: body.description?.trim() || null,
      linesJson: invoiceLinesToJson(calc.lines),
      subtotalMinor: calc.subtotalMinor,
      vatMinor: calc.vatMinor,
      totalMinor: calc.totalMinor,
      createdByStaffUserId: auth.staffUserId,
    },
  });

  await prisma.financeInvoiceApprovalLog.create({
    data: {
      siteId: auth.siteId,
      invoiceId: created.id,
      action: status === "pending_approval" ? "created_pending" : "created_draft",
      actorUserId: auth.staffUserId,
      note: body.title?.trim() || "Manuel fatura oluşturuldu.",
    },
  });

  return NextResponse.json({ invoice: { id: created.id } }, { status: 201 });
}
