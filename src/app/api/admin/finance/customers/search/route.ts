import { NextResponse } from "next/server";
import { searchCustomersForCounterparty } from "@/lib/finance/customer-counterparty-prefill";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const customers = await searchCustomersForCounterparty(auth.siteId, q);
  return NextResponse.json({ customers });
}
