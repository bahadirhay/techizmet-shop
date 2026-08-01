import { NextResponse } from "next/server";
import { scanGoogleAppearance } from "@/lib/admin/google-appearance/scan";
import { requireStaffApi } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await scanGoogleAppearance(auth.siteId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tarama başarısız" },
      { status: 500 },
    );
  }
}
