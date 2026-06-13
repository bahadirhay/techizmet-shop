import { NextResponse } from "next/server";
import {
  buildCartAbandonmentWhatsappUrl,
  markCartAbandonmentWhatsappReminded,
} from "@/lib/analytics/cart-abandonment-whatsapp";
import { requireStaffApi } from "@/lib/staff-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const built = await buildCartAbandonmentWhatsappUrl(auth.siteId, id);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  await markCartAbandonmentWhatsappReminded(auth.siteId, id);
  return NextResponse.json({ ok: true, waUrl: built.waUrl, phone: built.phone });
}
