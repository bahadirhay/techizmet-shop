import { NextResponse } from "next/server";
import { syncHeaderNavFromCategories } from "@/lib/nav-menu-sync-categories";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST() {
  const auth = await requireStaffApi("site.theme");
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await syncHeaderNavFromCategories(auth.siteId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Senkron başarısız";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
