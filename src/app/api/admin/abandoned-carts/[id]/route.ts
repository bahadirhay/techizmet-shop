import { NextResponse } from "next/server";
import { dismissCartAbandonment } from "@/lib/analytics/cart-abandonment";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const body = (await req.json()) as { notes?: string | null; dismiss?: boolean };

  if (body.dismiss) {
    const ok = await dismissCartAbandonment(auth.siteId, id);
    if (!ok) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (body.notes !== undefined) {
    const notes =
      body.notes === null ? null : String(body.notes).trim().slice(0, 4000) || null;
    const row = await prisma.cartAbandonment.updateMany({
      where: { id, siteId: auth.siteId, status: "open" },
      data: { notes },
    });
    if (!row.count) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
}
