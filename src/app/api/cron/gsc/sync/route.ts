import { NextResponse } from "next/server";
import { recordCronRun } from "@/lib/cron-health";
import { verifyCronRequest } from "@/lib/cron-auth";
import { syncGscQueries } from "@/lib/admin/gsc/sync";
import { getDefaultSite } from "@/lib/site";

/** GSC arama sorguları — GET /api/cron/gsc/sync?secret=CRON_SECRET&days=7 */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? "7") || 7));

  const site = await getDefaultSite();
  const started = Date.now();
  try {
    const result = await syncGscQueries(site.id, { days });
    await recordCronRun(site.id, "gscSync", {
      ok: result.ok,
      durationMs: Date.now() - started,
      summary: {
        rowCount: result.cached?.rowCount ?? 0,
        skipped: result.skipped ?? false,
        reason: result.reason ?? result.error,
      },
    });
    if (!result.ok && !result.skipped) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron hatası";
    await recordCronRun(site.id, "gscSync", {
      ok: false,
      durationMs: Date.now() - started,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
