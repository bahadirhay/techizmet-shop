import { NextResponse } from "next/server";
import { sendCartAbandonmentReminders } from "@/lib/analytics/cart-abandonment-email";
import { recordCronRun } from "@/lib/cron-health";
import { verifyCronRequest } from "@/lib/cron-auth";
import { getDefaultSite } from "@/lib/site";

/** Sepet terk hatırlatma — GET /api/cron/cart-abandonment/remind?secret=CRON_SECRET */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const site = await getDefaultSite();
  const started = Date.now();
  try {
    const result = await sendCartAbandonmentReminders(site.id);
    await recordCronRun(site.id, "cartAbandonmentRemind", {
      ok: true,
      durationMs: Date.now() - started,
      summary: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron hatası";
    await recordCronRun(site.id, "cartAbandonmentRemind", {
      ok: false,
      durationMs: Date.now() - started,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
