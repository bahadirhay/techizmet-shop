import { NextResponse } from "next/server";
import { runScheduledMarketplaceOrderPulls } from "@/lib/marketplace/scheduled-pull";

/**
 * Ücretsiz zamanlanmış sipariş çekme.
 * Windows Görev Zamanlayıcı veya cron ile 5–15 dk'da bir çağırın:
 * GET /api/cron/marketplace/orders?secret=CRON_SECRET
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET tanımlı değil (.env)" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = url.searchParams.get("force") === "1";
  const logs = await runScheduledMarketplaceOrderPulls({ force });

  return NextResponse.json({ ok: true, logs });
}
