import { NextResponse } from "next/server";
import { fixGoogleAppearance } from "@/lib/admin/google-appearance/fix";
import { requireStaffApi } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await fixGoogleAppearance(auth.siteId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Düzeltme başarısız" },
      { status: 500 },
    );
  }
}
