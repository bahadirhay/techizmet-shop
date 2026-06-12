import { NextResponse } from "next/server";
import { z } from "zod";
import { recordStoreEvents } from "@/lib/analytics/events";
import { getCustomerSession } from "@/lib/customer-session";
import { clientIp, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getDefaultSite } from "@/lib/site";

const eventSchema = z.object({
  type: z.enum([
    "page_view",
    "product_view",
    "search_query",
    "add_to_cart",
    "remove_from_cart",
    "begin_checkout",
  ]),
  payload: z.record(z.string(), z.unknown()).default({}),
  at: z.string().optional(),
});

const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(25),
  utm: z
    .object({
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const rl = await enforceRateLimit(`events:${clientIp(req)}`, 60, 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Geçersiz istek" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Geçersiz olay verisi" }, { status: 400 });
  }

  const site = await getDefaultSite();
  const session = await getCustomerSession();
  const userAgent = req.headers.get("user-agent");

  try {
    const result = await recordStoreEvents({
      siteId: site.id,
      events: parsed.data.events,
      customerId: session.isLoggedIn ? session.customerId : null,
      userAgent,
      utm: parsed.data.utm,
    });
    return NextResponse.json({ ok: true, recorded: result.recorded, visitorKey: result.visitorKey });
  } catch (e) {
    console.error("[events]", e);
    return NextResponse.json({ ok: false, error: "Kayıt başarısız" }, { status: 500 });
  }
}
