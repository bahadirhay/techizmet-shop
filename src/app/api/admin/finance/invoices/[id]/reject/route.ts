import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json({ error: "Red sebebi zorunlu." }, { status: 400 });
  }

  const invoice = await prisma.financeInvoice.findFirst({
    where: { id, siteId: auth.siteId },
    select: { id: true, status: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı." }, { status: 404 });
  }
  if (invoice.status === "posted") {
    return NextResponse.json({ error: "Muhasebeye işlenen fatura reddedilemez." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.financeInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "rejected",
        rejectedByStaffUserId: auth.staffUserId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    }),
    prisma.financeInvoiceApprovalLog.create({
      data: {
        siteId: auth.siteId,
        invoiceId: invoice.id,
        action: "rejected",
        actorUserId: auth.staffUserId,
        note: reason,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
