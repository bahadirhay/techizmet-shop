import { NextResponse } from "next/server";
import { syncInboundGibInvoices } from "@/lib/efatura/inbound-sync";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST() {
  const auth = await requireStaffApi("store.finance");
  if (auth instanceof NextResponse) return auth;
  const result = await syncInboundGibInvoices(auth.siteId, auth.staffUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result);
}
