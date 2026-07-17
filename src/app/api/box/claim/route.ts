import { NextResponse } from "next/server";
import { grantBoxQrReward } from "@/lib/box-qr/grant";
import { requireCustomerApi } from "@/lib/account/require-customer";

export async function POST() {
  const auth = await requireCustomerApi();
  if (auth instanceof NextResponse) return auth;

  const result = await grantBoxQrReward(auth.siteId, auth.customer.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
