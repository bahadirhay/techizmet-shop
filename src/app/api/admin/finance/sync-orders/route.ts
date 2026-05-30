import { NextResponse } from "next/server";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { syncOrdersToFinance } from "@/lib/finance/sync-orders";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  await ensureFinanceDefaults(auth.siteId);

  const body = (await req.json()) as { sinceDays?: number; orderId?: string };
  const result = await syncOrdersToFinance(auth.siteId, {
    sinceDays: body.sinceDays ?? 90,
    orderId: body.orderId,
  });

  return NextResponse.json({ result });
}
