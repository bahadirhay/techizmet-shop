import { NextResponse } from "next/server";
import { seedVitrinHeaderMenu } from "@/lib/nav-menu-seed";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("site.theme");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as { replace?: boolean };
  const result = await seedVitrinHeaderMenu(auth.siteId, !!body.replace);
  return NextResponse.json(result);
}
