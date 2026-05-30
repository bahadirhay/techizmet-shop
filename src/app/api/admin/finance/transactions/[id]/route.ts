import { NextResponse } from "next/server";
import { linkDeductionToOrder } from "@/lib/finance/reconciliation";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    linkOrderId?: string;
    reconciliationStatus?: string;
  };

  if (body.linkOrderId) {
    const result = await linkDeductionToOrder(auth.siteId, id, body.linkOrderId);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
    return NextResponse.json({ result });
  }

  if (body.reconciliationStatus) {
    await prisma.financeTransaction.updateMany({
      where: { id, siteId: auth.siteId },
      data: { reconciliationStatus: body.reconciliationStatus },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
}
