import { NextResponse } from "next/server";
import { runSeoDashboardFix } from "@/lib/admin/seo-dashboard/fix";
import type { SeoDashboardFixTarget } from "@/lib/admin/seo-dashboard/types";
import { requireStaffApi } from "@/lib/staff-auth";

const TARGETS = new Set<SeoDashboardFixTarget>(["pages", "products", "image-alts", "all"]);

export async function POST(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as { target?: string; limit?: number };
  const target = (body.target ?? "all") as SeoDashboardFixTarget;
  if (!TARGETS.has(target)) {
    return NextResponse.json({ error: "Geçersiz target" }, { status: 400 });
  }

  try {
    const result = await runSeoDashboardFix(auth.siteId, {
      target,
      limit: body.limit,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SEO düzeltme başarısız" },
      { status: 500 },
    );
  }
}
