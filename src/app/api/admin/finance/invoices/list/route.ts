import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

/** Onay kuyruğu (FinanceInvoice) listesi — FinanceInvoicesManager yeniden yükleme için. */
export async function GET() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const invoices = await prisma.financeInvoice.findMany({
    where: { siteId: auth.siteId },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, email: true } },
      counterparty: { select: { id: true, title: true, type: true, taxId: true } },
      category: { select: { id: true, name: true, kind: true } },
      account: { select: { id: true, name: true, kind: true } },
    },
  });

  return NextResponse.json({ invoices });
}
