import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { generateStoreInsights } from "@/lib/admin/store-insights/recommend";

export const maxDuration = 120;

export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const result = await generateStoreInsights(auth.siteId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
