import { NextResponse } from "next/server";
import { scanSeoDashboard } from "@/lib/admin/seo-dashboard/scan";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  try {
    const scan = await scanSeoDashboard(auth.siteId);
    return NextResponse.json(scan);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SEO taraması başarısız" },
      { status: 500 },
    );
  }
}
