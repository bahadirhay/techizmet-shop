import { NextResponse } from "next/server";
import { runBlogAutomation } from "@/lib/admin/blog-automation/run";
import { recordCronRun } from "@/lib/cron-health";
import { verifyCronRequest } from "@/lib/cron-auth";
import { getDefaultSite } from "@/lib/site";

/** Blog otomasyon — GET /api/cron/blog-automation/run?secret=CRON_SECRET */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const site = await getDefaultSite();
  const started = Date.now();
  try {
    const result = await runBlogAutomation(site.id, site.name);
    await recordCronRun(site.id, "blogAutomation", {
      ok: true,
      durationMs: Date.now() - started,
      summary: result,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron hatası";
    await recordCronRun(site.id, "blogAutomation", {
      ok: false,
      durationMs: Date.now() - started,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
