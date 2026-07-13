import { NextResponse } from "next/server";
import { loadSocialPerformanceSummary } from "@/lib/admin/social-content/social-performance";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const summary = await loadSocialPerformanceSummary(auth.siteId);
  return NextResponse.json(summary);
}
