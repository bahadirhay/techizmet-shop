import { NextResponse } from "next/server";
import { buildOrderInvoicePreview } from "@/lib/efatura/order-invoice-preview";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const recipientTaxId = url.searchParams.get("recipientTaxId")?.trim() || undefined;

  const preview = await buildOrderInvoicePreview(auth.siteId, id, { recipientTaxId });
  if (!preview.ok) {
    return NextResponse.json({ error: preview.message }, { status: 400 });
  }

  return NextResponse.json({ preview });
}
