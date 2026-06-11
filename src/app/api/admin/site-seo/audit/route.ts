import { NextResponse } from "next/server";
import { auditSiteSeo } from "@/lib/admin/site-seo/optimizer";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await auditSiteSeo(auth.siteId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SEO analizi başarısız" },
      { status: 500 },
    );
  }
}
