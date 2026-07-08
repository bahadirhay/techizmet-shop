import { NextResponse } from "next/server";
import { recordCronRun } from "@/lib/cron-health";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runScheduledTrendyolQna } from "@/lib/marketplace/trendyol/qna-auto";
import { getDefaultSite } from "@/lib/site";

export const maxDuration = 300;

/**
 * Trendyol müşteri sorularını otomatik cevaplama cron'u.
 * GET /api/cron/marketplace/trendyol-qna?secret=CRON_SECRET
 */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const site = await getDefaultSite();
  const force = new URL(req.url).searchParams.get("force") === "1";
  const started = Date.now();
  try {
    const logs = await runScheduledTrendyolQna({ force });
    await recordCronRun(site.id, "trendyolQna", {
      ok: true,
      durationMs: Date.now() - started,
      summary: { runs: logs.length },
    });
    return NextResponse.json({ ok: true, logs });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron hatası";
    await recordCronRun(site.id, "trendyolQna", {
      ok: false,
      durationMs: Date.now() - started,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
