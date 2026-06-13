import { NextResponse } from "next/server";
import { sendSingleCartAbandonmentReminder } from "@/lib/analytics/cart-abandonment-email";
import { requireStaffApi } from "@/lib/staff-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { force?: boolean };
  const result = await sendSingleCartAbandonmentReminder(auth.siteId, id, {
    force: body.force === true,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
