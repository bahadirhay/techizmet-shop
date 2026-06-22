import { NextResponse } from "next/server";
import { recordCronRun } from "@/lib/cron-health";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runScheduledSocialPublishes } from "@/lib/social-publish/run-scheduled";
import { getDefaultSite } from "@/lib/site";

/** Zamanlanmış sosyal içerik yayını — GET /api/cron/social/publish */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const site = await getDefaultSite();
  const started = Date.now();

  try {
    const result = await runScheduledSocialPublishes(site.id);
    await recordCronRun(site.id, "socialPublish", {
      ok: result.failed === 0,
      durationMs: Date.now() - started,
      summary: {
        processed: result.processed,
        published: result.published,
        failed: result.failed,
      },
      error: result.failed ? `${result.failed} yayın başarısız` : undefined,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron hatası";
    await recordCronRun(site.id, "socialPublish", {
      ok: false,
      durationMs: Date.now() - started,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
