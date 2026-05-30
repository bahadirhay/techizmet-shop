import { NextResponse } from "next/server";
import { issueOrderInvoice } from "@/lib/efatura/order-invoice";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json()) as {
    recipientTaxId?: string;
    sign?: boolean;
    sendToMarketplace?: boolean;
    force?: boolean;
  };

  const result = await issueOrderInvoice(auth.siteId, id, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.message, result }, { status: 400 });
  }
  return NextResponse.json({ result });
}
