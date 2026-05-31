import { NextResponse } from "next/server";
import { syncNavItemMegaFromCategory } from "@/lib/nav-menu-sync-categories";
import { requireStaffApi } from "@/lib/staff-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireStaffApi("site.theme");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  try {
    const result = await syncNavItemMegaFromCategory(auth.siteId, id);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Senkron başarısız";
    const status = msg.includes("bulunamadı") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
