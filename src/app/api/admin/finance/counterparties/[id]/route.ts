import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const existing = await prisma.financeCounterparty.findFirst({
    where: { id, siteId: auth.siteId },
  });
  if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const body = (await req.json()) as {
    paymentTermDays?: number | null;
    creditLimitMinor?: number | null;
    openAccountEnabled?: boolean;
    creditHold?: boolean;
    preferredPaymentMethod?: string | null;
    tags?: string | null;
  };

  const row = await prisma.financeCounterparty.update({
    where: { id },
    data: {
      paymentTermDays:
        body.paymentTermDays !== undefined ? body.paymentTermDays : undefined,
      creditLimitMinor:
        body.creditLimitMinor !== undefined ? body.creditLimitMinor : undefined,
      openAccountEnabled:
        body.openAccountEnabled !== undefined ? body.openAccountEnabled : undefined,
      creditHold: body.creditHold !== undefined ? body.creditHold : undefined,
      preferredPaymentMethod:
        body.preferredPaymentMethod !== undefined
          ? body.preferredPaymentMethod
          : undefined,
      tags: body.tags !== undefined ? body.tags : undefined,
    },
  });

  return NextResponse.json({ counterparty: row });
}
