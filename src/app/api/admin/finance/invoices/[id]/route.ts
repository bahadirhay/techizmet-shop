import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    status?: string;
    categoryId?: string | null;
    accountId?: string | null;
    title?: string;
    description?: string;
  };
  const invoice = await prisma.financeInvoice.findFirst({
    where: { id, siteId: auth.siteId },
    select: { id: true, status: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı." }, { status: 404 });
  }
  if (invoice.status === "posted") {
    return NextResponse.json({ error: "Muhasebeye işlenen fatura düzenlenemez." }, { status: 400 });
  }

  const updated = await prisma.financeInvoice.update({
    where: { id: invoice.id },
    data: {
      categoryId: body.categoryId !== undefined ? body.categoryId || null : undefined,
      accountId: body.accountId !== undefined ? body.accountId || null : undefined,
      title: body.title !== undefined ? body.title.trim() || null : undefined,
      description: body.description !== undefined ? body.description.trim() || null : undefined,
      status:
        body.status === "pending_approval" || body.status === "draft"
          ? body.status
          : undefined,
    },
  });

  if (body.status === "pending_approval") {
    await prisma.financeInvoiceApprovalLog.create({
      data: {
        siteId: auth.siteId,
        invoiceId: invoice.id,
        action: "submit_for_approval",
        actorUserId: auth.staffUserId,
        note: "Taslak onay kuyruğuna gönderildi.",
      },
    });
  }

  return NextResponse.json({ invoice: updated });
}
