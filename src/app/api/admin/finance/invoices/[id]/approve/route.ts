import { NextResponse } from "next/server";
import { invoiceRequiresPosting } from "@/lib/finance/invoices";
import { postInvoiceToFinance } from "@/lib/finance/invoice-posting";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { note?: string };

  const invoice = await prisma.financeInvoice.findFirst({
    where: { id, siteId: auth.siteId },
    include: { customer: true, counterparty: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı." }, { status: 404 });
  }
  if (!invoiceRequiresPosting(invoice.status)) {
    return NextResponse.json({ error: "Bu fatura onaylanamaz." }, { status: 400 });
  }

  // 1. onay (4-eyes): sadece "approved"e taşır, post etmez.
  if (!invoice.firstApprovedByStaffUserId) {
    const updated = await prisma.financeInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "approved",
        firstApprovedByStaffUserId: auth.staffUserId,
        firstApprovedAt: new Date(),
      },
    });
    await prisma.financeInvoiceApprovalLog.create({
      data: {
        siteId: auth.siteId,
        invoiceId: invoice.id,
        action: "first_approval",
        actorUserId: auth.staffUserId,
        note: body.note?.trim() || "İlk onay verildi.",
      },
    });
    return NextResponse.json({ stage: "first_approval", invoice: updated });
  }

  if (invoice.firstApprovedByStaffUserId === auth.staffUserId) {
    return NextResponse.json({ error: "İkinci onay farklı kullanıcıdan olmalı." }, { status: 400 });
  }
  const queued = await prisma.$transaction(async (trx) => {
    const updated = await trx.financeInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "approved",
        secondApprovedByStaffUserId: auth.staffUserId,
        secondApprovedAt: new Date(),
      },
    });
    const job = await trx.financeInvoicePostJob.create({
      data: {
        siteId: auth.siteId,
        invoiceId: invoice.id,
        status: "queued",
        attempts: 0,
        createdByUserId: auth.staffUserId,
      },
    });
    await trx.financeInvoiceApprovalLog.create({
      data: {
        siteId: auth.siteId,
        invoiceId: invoice.id,
        action: "second_approval",
        actorUserId: auth.staffUserId,
        note: body.note?.trim() || "İkinci onay verildi, muhasebe job kuyruğa alındı.",
      },
    });
    return { updated, job };
  });

  // Hızlı yol: hemen post etmeyi dene, başarısız olursa retry job kalır.
  try {
    const posted = await postInvoiceToFinance(prisma, {
      siteId: auth.siteId,
      invoiceId: invoice.id,
      actorUserId: auth.staffUserId,
      note: body.note?.trim() || undefined,
    });
    await prisma.financeInvoicePostJob.update({
      where: { id: queued.job.id },
      data: { status: "done", completedAt: new Date() },
    });
    return NextResponse.json({ stage: "posted", posted });
  } catch (err) {
    await prisma.financeInvoicePostJob.update({
      where: { id: queued.job.id },
      data: {
        status: "failed",
        attempts: 1,
        lastError: err instanceof Error ? err.message : "Bilinmeyen hata",
        nextRetryAt: new Date(Date.now() + 60_000),
      },
    });
    return NextResponse.json({
      stage: "queued_retry",
      warning: "İkinci onay tamamlandı, muhasebe post ilk denemede başarısız. Retry kuyruğa alındı.",
    });
  }
}
