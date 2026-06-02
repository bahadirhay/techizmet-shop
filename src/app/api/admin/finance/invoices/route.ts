import { NextResponse } from "next/server";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import {
  invoiceLinesToJson,
  normalizeInvoiceLines,
  type DraftInvoiceLineInput,
} from "@/lib/finance/invoices";
import { resolvePostingByTemplate } from "@/lib/finance/posting-template";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim() || undefined;
  const rows = await prisma.financeInvoice.findMany({
    where: { siteId: auth.siteId, ...(status ? { status } : {}) },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: {
      customer: { select: { id: true, email: true, firstName: true, lastName: true } },
      counterparty: { select: { id: true, title: true, taxId: true } },
      category: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ invoices: rows });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  await ensureFinanceDefaults(auth.siteId);
  const body = (await req.json()) as {
    direction?: string;
    source?: string;
    issueDate?: string;
    dueDate?: string;
    title?: string;
    description?: string;
    customerId?: string;
    counterpartyId?: string;
    categoryId?: string;
    accountId?: string;
    lines?: DraftInvoiceLineInput[];
    sendToApproval?: boolean;
  };

  const direction = body.direction === "incoming" ? "incoming" : "outgoing";
  const source = body.source === "gib" ? "gib" : "manual";
  const linesInput = Array.isArray(body.lines) ? body.lines : [];
  const calc = normalizeInvoiceLines(linesInput);
  if (!calc.lines.length) {
    return NextResponse.json({ error: "En az bir geçerli satır ekleyin." }, { status: 400 });
  }

  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
  if (Number.isNaN(issueDate.getTime())) {
    return NextResponse.json({ error: "Geçersiz fatura tarihi." }, { status: 400 });
  }
  const dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "Geçersiz vade tarihi." }, { status: 400 });
  }
  if (!body.customerId && !body.counterpartyId) {
    return NextResponse.json({ error: "Karşı taraf (müşteri veya manuel) seçin." }, { status: 400 });
  }
  const calcPreviewInvoice = {
    source,
    direction,
    title: body.title?.trim() || null,
    description: body.description?.trim() || null,
    linesJson: invoiceLinesToJson(calc.lines),
    categoryId: body.categoryId || null,
    accountId: body.accountId || null,
  };
  const mapped = await resolvePostingByTemplate(auth.siteId, calcPreviewInvoice);

  const invoice = await prisma.financeInvoice.create({
    data: {
      siteId: auth.siteId,
      source,
      direction,
      status: body.sendToApproval ? "pending_approval" : "draft",
      issueDate,
      dueDate,
      counterpartyType: body.customerId ? "site_member" : "external_manual",
      customerId: body.customerId || null,
      counterpartyId: body.counterpartyId || null,
      title: body.title?.trim() || null,
      description: body.description?.trim() || null,
      linesJson: invoiceLinesToJson(calc.lines),
      subtotalMinor: calc.subtotalMinor,
      vatMinor: calc.vatMinor,
      totalMinor: calc.totalMinor,
      categoryId: body.categoryId || mapped.categoryId || null,
      accountId: body.accountId || mapped.accountId || null,
      createdByStaffUserId: auth.staffUserId,
    },
  });

  await prisma.financeInvoiceApprovalLog.create({
    data: {
      siteId: auth.siteId,
      invoiceId: invoice.id,
      action: body.sendToApproval ? "submit_for_approval" : "draft_saved",
      actorUserId: auth.staffUserId,
      note: body.sendToApproval ? "Onay kuyruğuna gönderildi." : "Taslak kaydedildi.",
    },
  });

  return NextResponse.json({ invoice });
}
