import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { syncFinishedProductsToStock } from "@/lib/stock/sync-products";

export async function POST() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const result = await syncFinishedProductsToStock(prisma, auth.siteId, {
    staffUserId: auth.staffUserId,
  });

  return NextResponse.json({ ok: true, ...result });
}
