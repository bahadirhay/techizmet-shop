import { NextResponse } from "next/server";
import { recordCronRun } from "@/lib/cron-health";
import { verifyCronRequest } from "@/lib/cron-auth";
import { runScheduledMarketplaceOrderPulls } from "@/lib/marketplace/scheduled-pull";
import { getDefaultSite } from "@/lib/site";

/**
 * Ücretsiz zamanlanmış sipariş çekme.
 * Windows Görev Zamanlayıcı veya cron ile 5–15 dk'da bir çağırın:
 * GET /api/cron/marketplace/orders?secret=CRON_SECRET
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
    const logs = await runScheduledMarketplaceOrderPulls({ force });
    await recordCronRun(site.id, "marketplaceOrders", {
      ok: true,
      durationMs: Date.now() - started,
      summary: { runs: logs.length },
    });
    return NextResponse.json({ ok: true, logs });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron hatası";
    await recordCronRun(site.id, "marketplaceOrders", {
      ok: false,
      durationMs: Date.now() - started,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
