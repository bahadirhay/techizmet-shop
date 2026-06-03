import { NextResponse } from "next/server";
import { sendCartAbandonmentReminders } from "@/lib/analytics/cart-abandonment-email";
import { getDefaultSite } from "@/lib/site";

/** Sepet terk hatırlatma — GET /api/cron/cart-abandonment/remind?secret=CRON_SECRET */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET tanımlı değil" }, { status: 503 });
  }

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const site = await getDefaultSite();
  const result = await sendCartAbandonmentReminders(site.id);
  return NextResponse.json({ ok: true, ...result });
}
