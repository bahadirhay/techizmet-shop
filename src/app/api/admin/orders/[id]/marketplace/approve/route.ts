import { NextResponse } from "next/server";
import { approveMarketplaceOrder, logMarketplaceAction } from "@/lib/marketplace/actions";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const order = await prisma.storeOrder.findFirst({ where: { id, siteId: auth.siteId } });
  const result = await approveMarketplaceOrder(auth.siteId, id);

  if (order?.marketplacePlatform) {
    await logMarketplaceAction(auth.siteId, order.marketplacePlatform, "approve_order", result);
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ result });
}
