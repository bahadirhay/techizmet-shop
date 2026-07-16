import { NextResponse } from "next/server";
import { recordCronRun } from "@/lib/cron-health";
import { verifyCronRequest } from "@/lib/cron-auth";
import { autoDeliverShippedOrders } from "@/lib/orders/auto-deliver";
import { getDefaultSite } from "@/lib/site";

/**
 * Kargoda kalan siparişleri teslim edildi yapar (varsayılan: kargoya verilmeden 7 gün sonra).
 * GET /api/cron/orders/auto-deliver?secret=CRON_SECRET
 */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const site = await getDefaultSite();
  const started = Date.now();
  try {
    const result = await autoDeliverShippedOrders(site.id);
    await recordCronRun(site.id, "ordersAutoDeliver", {
      ok: true,
      durationMs: Date.now() - started,
      summary: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron hatası";
    await recordCronRun(site.id, "ordersAutoDeliver", {
      ok: false,
      durationMs: Date.now() - started,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
