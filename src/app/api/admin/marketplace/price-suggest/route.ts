import { NextResponse } from "next/server";
import { resolveProductCommission } from "@/lib/marketplace/commission-rules";
import {
  DEFAULT_WEB_MARKUP_PERCENT,
  normalizeMarkupPercent,
  resolveSuggestedMarketplacePriceMinor,
} from "@/lib/marketplace/pricing-calculator";
import { tryToMinor } from "@/lib/admin/money";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform")?.trim();
  const categoryId = url.searchParams.get("categoryId")?.trim() || null;
  const webMinor = tryToMinor(url.searchParams.get("webPrice"));
  const markupPercent =
    normalizeMarkupPercent(url.searchParams.get("markupPercent")) ?? DEFAULT_WEB_MARKUP_PERCENT;

  if (!platform) {
    return NextResponse.json({ error: "platform gerekli" }, { status: 400 });
  }

  const rule = await resolveProductCommission(auth.siteId, platform, categoryId);
  const suggestedMinor =
    webMinor > 0
      ? resolveSuggestedMarketplacePriceMinor({ webPriceMinor: webMinor, markupPercent })
      : null;

  return NextResponse.json({
    rule,
    suggestedMinor,
    markupPercent,
    webPriceMinor: webMinor > 0 ? webMinor : null,
  });
}
