import { NextResponse } from "next/server";
import { runBlogAutomation } from "@/lib/admin/blog-automation/run";
import { getDefaultSite } from "@/lib/site";
import { requireStaffApi } from "@/lib/staff-auth";

export async function POST(req: Request) {
  const auth = await requireStaffApi("content.pages");
  if (auth instanceof NextResponse) return auth;

  let keyword: string | undefined;
  try {
    const body = (await req.json()) as { keyword?: string };
    keyword = body.keyword?.trim() || undefined;
  } catch {
    keyword = undefined;
  }

  const site = await getDefaultSite();
  if (site.id !== auth.siteId) {
    return NextResponse.json({ error: "Site uyuşmazlığı" }, { status: 400 });
  }

  try {
    const result = await runBlogAutomation(site.id, site.name, {
      force: true,
      keyword,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Üretim başarısız";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
