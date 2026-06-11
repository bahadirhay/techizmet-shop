import { NextResponse } from "next/server";
import { optimizeSiteSeo } from "@/lib/admin/site-seo/optimizer";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await optimizeSiteSeo(auth.siteId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SEO optimizasyonu başarısız" },
      { status: 500 },
    );
  }
}
